"""Move vector search to Pinecone without requiring a PostgreSQL extension."""
from alembic import op
import sqlalchemy as sa

revision = '0005'
down_revision = '0004'
branch_labels = None
depends_on = None


def upgrade():
    connection = op.get_bind()
    if not any(c['name'] == 'rag_generation' for c in sa.inspect(connection).get_columns('documents')):
        op.add_column('documents', sa.Column('rag_generation', sa.String(36), nullable=True))
    if connection.dialect.name == 'postgresql':
        column_type = connection.execute(sa.text(
            "SELECT data_type FROM information_schema.columns "
            "WHERE table_schema=current_schema() AND table_name='document_chunks' AND column_name='embedding'"
        )).scalar()
        if column_type == 'USER-DEFINED':
            # Existing pgvector deployments retain their legacy values as JSON.
            op.execute('ALTER TABLE document_chunks ALTER COLUMN embedding TYPE JSON USING embedding::text::json')


def downgrade():
    # Keep JSON so downgrade never introduces an extension dependency.
    op.drop_column('documents', 'rag_generation')
