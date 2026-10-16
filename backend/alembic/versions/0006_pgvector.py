"""Store embeddings with their authorised document chunks in PostgreSQL."""
from alembic import op
import sqlalchemy as sa
from app.core.config import get_settings

revision = '0006'
down_revision = '0005'
branch_labels = None
depends_on = None


def upgrade():
    connection = op.get_bind()
    if connection.dialect.name == 'postgresql':
        dimensions = get_settings().embedding_dimensions
        op.execute('CREATE EXTENSION IF NOT EXISTS vector')
        # Preserve compatible legacy JSON embeddings. Missing vectors must be
        # regenerated from the original documents, rather than fabricated.
        op.execute(f'''ALTER TABLE document_chunks ALTER COLUMN embedding
            TYPE vector({dimensions}) USING CASE
                WHEN embedding IS NULL OR json_typeof(embedding) <> 'array' THEN NULL
                WHEN json_array_length(embedding) = {dimensions}
                    THEN embedding::text::vector({dimensions})
                ELSE NULL END''')
        op.execute('''UPDATE documents SET processing_status = 'uploaded',
            processing_error = 'Reprocess this document to populate pgvector embeddings.'
            WHERE rag_generation IS NOT NULL AND EXISTS (
                SELECT 1 FROM document_chunks
                WHERE document_id = documents.id AND embedding IS NULL)''')
    op.drop_column('documents', 'rag_generation')


def downgrade():
    op.add_column('documents', sa.Column('rag_generation', sa.String(36), nullable=True))
    if op.get_bind().dialect.name == 'postgresql':
        op.execute('''ALTER TABLE document_chunks ALTER COLUMN embedding
            TYPE JSON USING embedding::text::json''')
