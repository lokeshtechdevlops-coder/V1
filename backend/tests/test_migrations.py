from pathlib import Path
from alembic.config import Config
from alembic import command
from sqlalchemy import create_engine, inspect, text
from app.core.config import get_settings
from app.core.database import Base


def test_frozen_migrations_match_models(tmp_path, monkeypatch):
    url=f'sqlite:///{tmp_path / "migration.db"}'
    monkeypatch.setattr(get_settings(),'database_url',url)
    config=Config(str(Path(__file__).resolve().parents[1]/'alembic.ini'))
    command.upgrade(config,'head')
    engine=create_engine(url)
    assert set(Base.metadata.tables).issubset(inspect(engine).get_table_names())
    command.check(config)
    # Recover a SQLite ALTER TABLE that completed before its version update.
    with engine.begin() as connection:
        connection.execute(text("UPDATE alembic_version SET version_num='0003'"))
    command.upgrade(config,'head')
    command.check(config)
    command.downgrade(config,'base')
    assert set(inspect(engine).get_table_names())=={'alembic_version'}
    engine.dispose()
