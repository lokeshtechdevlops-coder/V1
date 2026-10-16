"""Shorten account IDs to a role prefix and eight characters."""
from uuid import uuid4
from alembic import op
import sqlalchemy as sa

revision = '0009'
down_revision = '0008'
branch_labels = None
depends_on = None


def upgrade():
    connection = op.get_bind()
    users = sa.table('users', sa.column('id', sa.String), sa.column('account_id', sa.String))
    rows = connection.execute(sa.select(users.c.id, users.c.account_id)).all()
    assigned = {row.account_id for row in rows}
    for row in rows:
        if len(row.account_id) == 12:
            continue
        candidate = row.account_id[:12]
        while candidate in assigned:
            candidate = f'{row.account_id[:4]}{uuid4().hex[:8]}'
        connection.execute(users.update().where(users.c.id == row.id).values(account_id=candidate))
        assigned.add(candidate)


def downgrade():
    # Short IDs also fit the previous schema; retain users' assigned IDs.
    pass
