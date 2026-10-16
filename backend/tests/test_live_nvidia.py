"""Opt-in provider checks using temporary schemas and fictional records only."""
import os
from uuid import uuid4
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select, text
from sqlalchemy.orm import sessionmaker
from app.core.config import get_settings
from app.core.database import Base, get_db
from app.main import app
from app.api.routes import attempts
from app.models import Appointment, Document, User
from app.rag.retrieval import retrieve
from app.seed import seed

pytestmark = [pytest.mark.live, pytest.mark.skipif(os.environ.get('RUN_LIVE_NVIDIA')!='1',
    reason='Explicit RUN_LIVE_NVIDIA=1 required; sends fictional data to NVIDIA.')]


@pytest.fixture
def live_hospital(monkeypatch):
    url = os.environ.get('TEST_POSTGRES_URL')
    if not url:
        pytest.skip('Set TEST_POSTGRES_URL to a disposable PostgreSQL database.')
    settings = get_settings()
    assert settings.nvidia_api_key, 'Configure NVIDIA_API_KEY before enabling live tests.'
    schema = 'live_' + uuid4().hex
    control = create_engine(url)
    with control.begin() as connection:
        connection.execute(text(f'CREATE SCHEMA {schema}'))
    engine = create_engine(url, connect_args={'options':f'-csearch_path={schema},public'})
    factory = sessionmaker(bind=engine, expire_on_commit=False)
    try:
        Base.metadata.create_all(engine, checkfirst=False)
        with factory() as db:
            seed(db)
        monkeypatch.setattr(settings, 'ai_mode', 'nim')
        def override():
            with factory() as db:
                try:
                    yield db
                except Exception:
                    db.rollback()
                    raise
        app.dependency_overrides[get_db] = override
        attempts.clear()
        clients = {}
        for role,email in [('patient','patient@carenexus.local'),('admin','admin@carenexus.local')]:
            client = TestClient(app)
            response = client.post('/api/auth/login',json={'email':email,'password':'DemoHospital!2026'})
            assert response.status_code == 200
            client.headers['x-csrf-token'] = response.json()['csrf_token']
            clients[role] = client
        try:
            yield factory, clients
        finally:
            for client in clients.values():
                client.close()
    finally:
        app.dependency_overrides.clear()
        engine.dispose()
        with control.begin() as connection:
            connection.execute(text(f'DROP SCHEMA {schema} CASCADE'))
        control.dispose()


def test_live_nim_booking_is_a_proposal_until_confirmed(live_hospital):
    factory,clients = live_hospital
    patient = clients['patient']
    reply = patient.post('/api/chat',json={'message':
        'Please book my available appointment slot dr-sarah-0-1 for a fictional verification consultation. '
        'Create a booking proposal for my own patient account so I can confirm it.'})
    assert reply.status_code == 200, reply.text
    result = reply.json()
    assert result['mode'] == 'nim'
    assert result['agent'] == 'appointment'
    assert result['actions'], result['answer']
    action = result['actions'][0]
    assert action['status'] == 'pending'
    with factory() as db:
        assert db.scalar(select(Appointment).where(Appointment.reservation_slot_id=='dr-sarah-0-1')) is None
    confirmed = patient.post(f"/api/actions/{action['id']}/confirm")
    assert confirmed.status_code == 200, confirmed.text
    assert confirmed.json()['status'] == 'executed'
    history = patient.get(f"/api/conversations/{result['conversation_id']}/messages").json()
    assert next(m for m in history if m['role']=='assistant')['actions'][0]['status'] == 'executed'


def test_live_embeddings_and_cited_answers_respect_deactivation(live_hospital):
    factory,clients = live_hospital
    patient,admin = clients['patient'],clients['admin']
    document = admin.post('/api/documents',data={'title':'Verification desk policy',
        'category':'policy','audience':'public'},files={'file':('policy.txt',
        b'Approved fictional hospital policy: the verification desk reference code is VERIFY-RAG-914. '
        b'The verification desk operates on weekdays from 09:15 to 16:45.','text/plain')})
    assert document.status_code == 200, document.text
    doc_id = document.json()['id']
    indexed = admin.post(f'/api/documents/{doc_id}/process')
    assert indexed.status_code == 200, indexed.text
    with factory() as db:
        found = retrieve(db,db.get(User,'patient-1'),'verification desk reference code')
        assert doc_id in [row['document_id'] for row in found]
    reply = patient.post('/api/chat',json={'message':
        'According to the approved Verification desk policy, what is the verification desk reference code? '
        'Look it up in hospital documents and cite the policy.'})
    assert reply.status_code == 200, reply.text
    answer = reply.json()
    assert doc_id in [c['document_id'] for c in answer['citations']], answer['answer']
    assert 'VERIFY-RAG-914' in answer['answer']
    assert admin.patch(f'/api/documents/{doc_id}/active',json={'active':False}).status_code == 200
    with factory() as db:
        assert doc_id not in [row['document_id'] for row in retrieve(db,db.get(User,'patient-1'),'verification desk reference code')]
    denied = patient.post('/api/chat',json={'message':'Show the report for Priya Rao'})
    assert denied.status_code == 403
    assert 'PRIVATE-PRIYA' not in denied.text
