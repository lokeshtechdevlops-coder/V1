import os
import tempfile
from pathlib import Path
from uuid import uuid4
os.environ['JWT_SECRET'] = 'test-secret-never-use-this-in-production-0123456789'
os.environ['DATABASE_URL'] = 'sqlite://'
os.environ['AI_MODE'] = 'demo'
os.environ['STORAGE_DIR'] = tempfile.mkdtemp(prefix='carenexus-tests-')

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.core.database import Base, get_db
from app.main import app
from app.seed import seed
from app.api.routes import attempts


@pytest.fixture
def db_factory(tmp_path):
    postgres_url = os.environ.get('TEST_POSTGRES_URL') if os.environ.get('VERIFY_POSTGRES_WORKFLOWS') == '1' else None
    control = None
    schema = None
    if postgres_url:
        schema = 'workflow_' + uuid4().hex
        control = create_engine(postgres_url)
        with control.begin() as connection:
            connection.execute(text(f'CREATE SCHEMA {schema}'))
        engine = create_engine(postgres_url, connect_args={'options':f'-csearch_path={schema},public'})
    else:
        engine = create_engine(f'sqlite:///{tmp_path / "test.db"}', connect_args={'check_same_thread': False})
    # A fresh schema must create its own tables, even if a search_path fallback
    # exposes identically named tables. Never seed or mutate fallback tables.
    try:
        Base.metadata.create_all(engine, checkfirst=False)
        factory = sessionmaker(bind=engine, expire_on_commit=False)
        with factory() as db:
            seed(db)
        yield factory
    finally:
        engine.dispose()
        if control:
            with control.begin() as connection:
                connection.execute(text(f'DROP SCHEMA {schema} CASCADE'))
            control.dispose()


@pytest.fixture
def clients(db_factory):
    def override():
        with db_factory() as db:
            try:
                yield db
            except Exception:
                db.rollback()
                raise
    app.dependency_overrides[get_db] = override
    attempts.clear()
    result = {}
    for role, email in [('patient','patient@carenexus.local'),('patient2','patient2@carenexus.local'),
                        ('doctor','doctor@carenexus.local'),('doctor2','doctor2@carenexus.local'),('admin','admin@carenexus.local')]:
        client = TestClient(app)
        response = client.post('/api/auth/login', json={'email': email, 'password': 'DemoHospital!2026'})
        assert response.status_code == 200, response.text
        client.headers['x-csrf-token'] = response.json()['csrf_token']
        result[role] = client
    yield result
    for client in result.values():
        client.close()
    app.dependency_overrides.clear()
