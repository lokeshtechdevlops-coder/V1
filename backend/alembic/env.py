from logging.config import fileConfig
from alembic import context
from sqlalchemy import create_engine
from app.core.config import get_settings
from app.core.database import Base
import app.models  # register tables

config = context.config
if config.config_file_name:
    fileConfig(config.config_file_name)
url = get_settings().database_url


def include_object(obj, name, type_, reflected, compare_to):
    # Alembic owns this table. Default-schema normalization can otherwise make
    # autogenerate compare it against application metadata as an extra table.
    return not (type_ == 'table' and name == 'alembic_version')

if context.is_offline_mode():
    context.configure(url=url, target_metadata=Base.metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()
else:
    with create_engine(url).connect() as connection:
        context.configure(connection=connection, target_metadata=Base.metadata, compare_type=True,
                          include_object=include_object,
                          version_table_schema=connection.dialect.default_schema_name
                          if connection.dialect.name == 'postgresql' else None)
        with context.begin_transaction():
            context.run_migrations()
