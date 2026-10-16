"""Preserve historical embeddings when the provider changes output dimensions."""
from alembic import op
import sqlalchemy as sa
from app.core.config import get_settings

revision = '0007'
down_revision = '0006'
branch_labels = None
depends_on = None


def upgrade():
    if op.get_bind().dialect.name == 'postgresql':
        # Remove only the fixed-size modifier; all existing vectors/text survive.
        # Retrieval requires the configured model AND matching vector dimensions.
        op.execute('ALTER TABLE document_chunks ALTER COLUMN embedding TYPE vector USING embedding::vector')


def downgrade():
    connection = op.get_bind()
    if connection.dialect.name == 'postgresql':
        dimensions = get_settings().embedding_dimensions
        incompatible = connection.scalar(sa.text(
            'SELECT count(*) FROM document_chunks WHERE embedding IS NOT NULL AND vector_dims(embedding) <> :dimensions'
        ), {'dimensions':dimensions})
        if incompatible:
            raise RuntimeError('Reprocess historical embeddings before downgrading; refusing to discard vectors.')
        op.execute(f'ALTER TABLE document_chunks ALTER COLUMN embedding TYPE vector({dimensions}) USING embedding::vector({dimensions})')
