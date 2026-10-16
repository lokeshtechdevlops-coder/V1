"""Require approval for self-registered staff accounts."""
from alembic import op
import sqlalchemy as sa
revision = '0004'
down_revision = '0003'
branch_labels = None
depends_on = None

def upgrade():
    connection = op.get_bind()
    # SQLite can retain an ALTER TABLE after an interrupted migration without
    # advancing alembic_version. Retrying must preserve accounts and finish safely.
    existing = connection.dialect.name == 'sqlite' and any(
        column['name'] == 'signup_status' for column in sa.inspect(connection).get_columns('users'))
    if not existing:
        op.add_column('users', sa.Column('signup_status', sa.String(20), nullable=False, server_default='approved'))

def downgrade():
    op.drop_column('users', 'signup_status')
