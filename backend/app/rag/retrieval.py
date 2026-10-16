import re
from sqlalchemy import and_, case, delete, func, select
from fastapi import HTTPException
from pypdf import PdfReader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.core.config import get_settings
from app.models import Document, DocumentChunk
from app.services.access import audit, document_scope
from app.services.storage import document_path


def require_vector_database(db):
    if db.get_bind().dialect.name != 'postgresql':
        raise HTTPException(503, 'Semantic RAG requires PostgreSQL with pgvector. Use AI_MODE=demo for SQLite.')


def embedding_client():
    from langchain_nvidia_ai_endpoints import NVIDIAEmbeddings
    config = get_settings()
    return NVIDIAEmbeddings(model=config.nvidia_embedding_model, api_key=config.nvidia_api_key,
                            base_url=config.nvidia_base_url, dimensions=config.embedding_dimensions, timeout=30)


def process_document(db, user, doc):
    path = document_path(doc)
    if path.suffix == '.pdf':
        reader = PdfReader(path)
        if len(reader.pages) > 100:
            raise HTTPException(422, 'Limit PDFs to 100 pages.')
        text = '\n'.join((p.extract_text() or '') for p in reader.pages)
    elif path.suffix in {'.txt', '.md'}:
        text = path.read_text(encoding='utf-8')
    else:
        raise HTTPException(422, 'Images can be downloaded, but OCR indexing is not supported.')
    if not text.strip():
        raise HTTPException(422, 'No extractable text. Upload a text PDF; scanned PDFs require OCR.')
    if len(text) > 300_000:
        raise HTTPException(422, 'Document text exceeds the processing limit.')
    chunks = RecursiveCharacterTextSplitter(chunk_size=1200, chunk_overlap=150).split_text(text)
    settings = get_settings()
    vectors = [None] * len(chunks)
    model = ''
    if settings.ai_mode == 'nim':
        require_vector_database(db)
        vectors = embedding_client().embed_documents(chunks)
        model = settings.nvidia_embedding_model
        if len(vectors) != len(chunks) or any(len(v) != settings.embedding_dimensions for v in vectors):
            raise HTTPException(502, 'Embedding model dimensions do not match configuration.')
    records = [DocumentChunk(document_id=doc.id, position=i, content=content,
                            embedding=vectors[i], embedding_model=model) for i, content in enumerate(chunks)]
    # Chunks, embeddings and publication status commit in the same SQL transaction.
    db.execute(delete(DocumentChunk).where(DocumentChunk.document_id == doc.id))
    db.add_all(records)
    doc.processing_status = 'indexed'
    doc.processing_error = ''
    audit(db, user, 'document.process', doc.id)
    db.flush()
    return len(chunks)


def retrieve(db, user, query, limit=5):
    # Authorisation is part of the SQL selection, never a filter on model output.
    statement = select(DocumentChunk, Document).join(Document, Document.id == DocumentChunk.document_id).where(
        Document.active.is_(True), Document.processing_status == 'indexed', document_scope(db, user))
    settings = get_settings()
    if settings.ai_mode == 'nim':
        require_vector_database(db)
        vector = embedding_client().embed_query(query)
        if len(vector) != settings.embedding_dimensions:
            raise HTTPException(502, 'Embedding dimension mismatch.')
        # Retain historical embeddings across model upgrades. CASE guards the
        # distance operation itself: PostgreSQL can reorder ordinary WHERE filters.
        distance = case((and_(
            DocumentChunk.embedding_model == settings.nvidia_embedding_model,
            func.vector_dims(DocumentChunk.embedding) == settings.embedding_dimensions),
            DocumentChunk.embedding.cosine_distance(vector)), else_=None)
        # Exact ranking preserves recall for restrictive patient/grant filters.
        # Access checks, model filtering and ranking run in one SQL statement.
        statement = statement.where(
            DocumentChunk.embedding.is_not(None),
            DocumentChunk.embedding_model == settings.nvidia_embedding_model,
            distance <= settings.retrieval_max_cosine_distance,
        ).order_by(distance, DocumentChunk.id).limit(limit)
        rows = db.execute(statement).all()
    else:
        # Explicit offline demo retrieval. No fabricated embeddings or AI responses.
        terms = set(re.findall(r'[a-zA-Z]{3,}', query.lower())) - {'the', 'what', 'are', 'show', 'hospital'}
        if not terms:
            return []
        from sqlalchemy import or_
        statement = statement.where(or_(*[DocumentChunk.content.ilike(f'%{term}%') for term in terms]))
        candidates = db.execute(statement.limit(200)).all()
        rows = sorted(candidates, key=lambda pair: sum(pair[0].content.lower().count(t) for t in terms), reverse=True)[:limit]
    result = []
    for chunk, doc in rows:
        audit(db, user, 'document.retrieve', doc.id)
        result.append({'document_id': doc.id, 'title': doc.title, 'chunk': chunk.position,
                       'text': chunk.content, 'version': doc.version})
    return result
