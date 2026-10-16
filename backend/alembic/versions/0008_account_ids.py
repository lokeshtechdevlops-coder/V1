"""Assign permanent role-prefixed account IDs without changing existing relations."""
from uuid import uuid4
from alembic import op
import sqlalchemy as sa

revision = '0008'
down_revision = '0007'
branch_labels = None
depends_on = None


def upgrade():
    connection = op.get_bind()
    # SQLite DDL can survive an interrupted migration; allow a safe retry.
    if not any(c['name'] == 'account_id' for c in sa.inspect(connection).get_columns('users')):
        op.add_column('users', sa.Column('account_id', sa.String(36), nullable=True))
    users = sa.table('users', sa.column('id', sa.String), sa.column('role', sa.String),
                     sa.column('account_id', sa.String))
    prefixes = {'patient': 'pat', 'doctor': 'doc', 'admin': 'adm'}
    for row in connection.execute(sa.select(users.c.id, users.c.role).where(users.c.account_id.is_(None))).all():
        connection.execute(users.update().where(users.c.id == row.id).values(
            account_id=f'{prefixes[row.role]}-{uuid4().hex}'))
    with op.batch_alter_table('users') as batch:
        batch.alter_column('account_id', existing_type=sa.String(36), nullable=False)
        batch.create_unique_constraint('uq_users_account_id', ['account_id'])


def downgrade():
    with op.batch_alter_table('users') as batch:
        batch.drop_constraint('uq_users_account_id', type_='unique')
        batch.drop_column('account_id')
