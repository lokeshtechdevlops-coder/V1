"""Transactional indexing unit tests and real PostgreSQL retrieval tests."""
import os
from types import SimpleNamespace
from uuid import uuid4
import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine, select, text
from sqlalchemy.orm import sessionmaker
from app.core.config import get_settings
from app.core.database import Base
from app.models import User, Document, DocumentChunk, CareGrant
from app.rag import retrieval
from app.seed import seed


def fake_embeddings(monkeypatch, vector=None):
    vector = vector or [1.0] + [0.0] * (get_settings().embedding_dimensions - 1)
    monkeypatch.setattr(retrieval, 'embedding_client', lambda: SimpleNamespace(
        embed_query=lambda query: vector,
        embed_documents=lambda chunks: [vector for _ in chunks]))


def test_sqlite_semantic_search_fails_explicitly(monkeypatch):
    monkeypatch.setattr(get_settings(), 'ai_mode', 'nim')
    # This check remains SQLite-specific even when the workflow fixture runs on PostgreSQL.
    from sqlalchemy.orm import Session
    engine = create_engine('sqlite://')
    try:
        with Session(engine) as db:
            with pytest.raises(HTTPException, match='Semantic RAG requires PostgreSQL'):
                retrieval.require_vector_database(db)
    finally:
        engine.dispose()


def test_failed_embeddings_preserve_previous_chunks(db_factory, monkeypatch):
    monkeypatch.setattr(get_settings(), 'ai_mode', 'nim')
    monkeypatch.setattr(retrieval, 'require_vector_database', lambda db: None)
    fake_embeddings(monkeypatch, [1.0, 0.0])  # Wrong dimensionality.
    with db_factory() as db:
        doc = db.scalar(select(Document).where(Document.patient_id == 'pt-john'))
        db.add(DocumentChunk(document_id=doc.id, position=0, content='Previous indexed report', embedding_model='previous-model'))
        doc.processing_status = 'indexed'
        db.flush()
        previous = db.scalars(select(DocumentChunk.id).where(DocumentChunk.document_id == doc.id)).all()
        previous_status = doc.processing_status
        with pytest.raises(HTTPException, match='dimensions do not match'):
            retrieval.process_document(db, db.get(User, 'doctor-1'), doc)
        assert db.scalars(select(DocumentChunk.id).where(DocumentChunk.document_id == doc.id)).all() == previous
        assert doc.processing_status == previous_status


@pytest.fixture
def postgres_factory(monkeypatch):
    url = os.environ.get('TEST_POSTGRES_URL')
    if not url:
        pytest.skip('Set TEST_POSTGRES_URL for actual pgvector verification.')
    schema = 'test_vector_' + uuid4().hex
    control = create_engine(url)
    with control.begin() as connection:
        assert connection.scalar(text("SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector')")), 'Enable vector in the test database.'
        connection.execute(text(f'CREATE SCHEMA {schema}'))
    engine = create_engine(url, connect_args={'options': f'-csearch_path={schema},public'})
    try:
        Base.metadata.create_all(engine, checkfirst=False)
        factory = sessionmaker(bind=engine, expire_on_commit=False)
        with factory() as db:
            seed(db)
        monkeypatch.setattr(get_settings(), 'ai_mode', 'nim')
        fake_embeddings(monkeypatch)
        yield factory
    finally:
        engine.dispose()
        with control.begin() as connection:
            connection.execute(text(f'DROP SCHEMA {schema} CASCADE'))
        control.dispose()


def indexed(db, patient_id, vector, title=None, model=None):
    doc = db.scalar(select(Document).where(Document.patient_id == patient_id))
    if title:
        doc = Document(title=title, category='report', audience='private', patient_id=patient_id,
            uploaded_by='doctor-1', filename='report.txt', stored_name=uuid4().hex,
            mime='text/plain', size=1, sha256='test', processing_status='indexed')
        db.add(doc)
        db.flush()
    db.query(DocumentChunk).filter(DocumentChunk.document_id == doc.id).delete()
    chunk = DocumentChunk(document_id=doc.id, position=0, content=doc.title,
        embedding=vector, embedding_model=model or get_settings().nvidia_embedding_model)
    db.add(chunk)
    doc.processing_status = 'indexed'
    db.flush()
    return doc, chunk


@pytest.mark.postgres
@pytest.mark.parametrize('user_id,allowed', [('patient-1', True), ('doctor-1', True), ('admin-1', False)])
def test_vector_ranking_enforces_patient_scope(postgres_factory, user_id, allowed):
    size = get_settings().embedding_dimensions
    with postgres_factory() as db:
        john, _ = indexed(db, 'pt-john', [0.8, 0.6] + [0.0] * (size - 2))
        indexed(db, 'pt-priya', [1.0] + [0.0] * (size - 1))  # Closer but forbidden.
        result = retrieval.retrieve(db, db.get(User, user_id), 'report')
        assert [row['document_id'] for row in result] == ([john.id] if allowed else [])


@pytest.mark.postgres
def test_vector_search_filters_models_inactive_docs_and_distance(postgres_factory):
    size = get_settings().embedding_dimensions
    close = [1.0] + [0.0] * (size - 1)
    far = [0.0, 1.0] + [0.0] * (size - 2)
    with postgres_factory() as db:
        doc, _ = indexed(db, 'pt-john', close)
        indexed(db, 'pt-john', far, title='Too distant')
        indexed(db, 'pt-john', close, title='Wrong model', model='another-model')
        indexed(db, 'pt-john', [1.0,0.0], title='Historical dimensions', model='old-provider-model')
        indexed(db, 'pt-john', [1.0,0.0], title='Wrong dimensions for current model')
        inactive, _ = indexed(db, 'pt-john', close, title='Inactive')
        inactive.active = False
        result = retrieval.retrieve(db, db.get(User, 'patient-1'), 'report')
        assert [row['document_id'] for row in result] == [doc.id]


@pytest.mark.postgres
def test_grant_revoked_during_embedding_call_is_respected(postgres_factory, monkeypatch):
    vector = [1.0] + [0.0] * (get_settings().embedding_dimensions - 1)
    with postgres_factory() as db:
        indexed(db, 'pt-john', vector)
        def embed(query):
            db.get(CareGrant, 'grant-john').active = False
            db.flush()
            return vector
        monkeypatch.setattr(retrieval, 'embedding_client', lambda: SimpleNamespace(embed_query=embed))
        assert retrieval.retrieve(db, db.get(User, 'doctor-1'), 'report') == []


@pytest.mark.postgres
def test_indexing_vectors_and_chunks_roll_back_together(postgres_factory):
    with postgres_factory() as db:
        doc = db.scalar(select(Document).where(Document.patient_id == 'pt-john'))
        before = db.scalars(select(DocumentChunk.id).where(DocumentChunk.document_id == doc.id)).all()
        retrieval.process_document(db, db.get(User, 'doctor-1'), doc)
        assert all(chunk.embedding is not None for chunk in db.scalars(
            select(DocumentChunk).where(DocumentChunk.document_id == doc.id)))
        db.rollback()
        assert db.scalars(select(DocumentChunk.id).where(DocumentChunk.document_id == doc.id)).all() == before
        assert all(chunk.embedding is None for chunk in db.scalars(
            select(DocumentChunk).where(DocumentChunk.document_id == doc.id)))
