"""Upgrade the historical JSON schema without losing document ownership or text."""
import json
import os
from pathlib import Path
from uuid import uuid4
import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, select, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session
from app.core.config import get_settings
from app.models import Document, DocumentChunk
from app.seed import seed


@pytest.mark.postgres
def test_pgvector_migration_preserves_legacy_vectors_and_marks_remote_documents(monkeypatch):
    url = os.environ.get('TEST_POSTGRES_URL')
    if not url:
        pytest.skip('Set TEST_POSTGRES_URL for PostgreSQL migration verification.')
    schema = 'test_migration_' + uuid4().hex
    control = create_engine(url)
    with control.begin() as connection:
        connection.execute(text(f'CREATE SCHEMA {schema}'))
    isolated_url = make_url(url).update_query_dict({'options': f'-csearch_path={schema},public'})
    engine = create_engine(isolated_url)
    settings = get_settings()
    monkeypatch.setattr(settings, 'database_url', isolated_url.render_as_string(hide_password=False))
    config = Config(str(Path(__file__).resolve().parents[1] / 'alembic.ini'))
    try:
        # Seed with the current ORM, then recreate the historical schema under test.
        command.upgrade(config, 'head')
        with Session(engine) as db:
            seed(db)
        command.downgrade(config, '0005')
        with Session(engine) as db:
            john = db.scalar(select(Document).where(Document.patient_id == 'pt-john'))
            priya = db.scalar(select(Document).where(Document.patient_id == 'pt-priya'))
            # Emulate a legacy local embedding and a document indexed remotely.
            vector = [1.0] + [0.0] * (settings.embedding_dimensions - 1)
            db.add(DocumentChunk(document_id=john.id, position=0, content='Preserved local text',
                                 embedding_model=settings.nvidia_embedding_model))
            db.flush()
            db.execute(text('UPDATE document_chunks SET embedding = CAST(:vector AS json) WHERE document_id = :id'),
                       {'vector': json.dumps(vector), 'id': john.id})
            db.add(DocumentChunk(document_id=priya.id, position=0, content='Preserved remote text',
                                 embedding_model=settings.nvidia_embedding_model))
            db.execute(text("UPDATE documents SET rag_generation = 'old-remote-generation', processing_status = 'indexed' WHERE id = :id"), {'id': priya.id})
            john_id, priya_id = john.id, priya.id
            db.commit()
        command.upgrade(config, 'head')
        with Session(engine) as db:
            chunk = db.scalar(select(DocumentChunk).where(DocumentChunk.document_id == john_id))
            assert list(chunk.embedding) == vector
            assert chunk.content == 'Preserved local text'
            assert db.get(Document, john_id).patient_id == 'pt-john'
            assert db.get(Document, priya_id).processing_status == 'uploaded'
            assert db.scalar(select(DocumentChunk.content).where(DocumentChunk.document_id == priya_id)) == 'Preserved remote text'
            assert db.scalar(text("SELECT format_type(atttypid, atttypmod) FROM pg_attribute WHERE attrelid = 'document_chunks'::regclass AND attname = 'embedding'")) == 'vector'
        command.downgrade(config, '0005')
        command.upgrade(config, 'head')
        with Session(engine) as db:
            assert list(db.scalar(select(DocumentChunk.embedding).where(DocumentChunk.document_id == john_id))) == vector
    finally:
        engine.dispose()
        with control.begin() as connection:
            connection.execute(text(f'DROP SCHEMA {schema} CASCADE'))
        control.dispose()
