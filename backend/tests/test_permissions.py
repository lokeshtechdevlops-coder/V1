from sqlalchemy import select
from app.models import Document, AuditLog, CareGrant


def test_patient_isolation_and_private_doctor_fields(clients):
    patient = clients['patient']
    rows = patient.get('/api/patients').json()
    assert [row['id'] for row in rows] == ['pt-john']
    assert patient.get('/api/patients/pt-priya').status_code == 403
    assert patient.get('/api/prescriptions?patient_id=pt-priya').status_code == 403
    assert patient.get('/api/documents?patient_id=pt-priya').status_code == 403
    assert all('email' not in row and 'phone' not in row for row in patient.get('/api/doctors').json())
    assert patient.post('/api/chat',json={'message':'Show the latest report for Priya Rao'}).status_code == 403
    assert patient.post('/api/chat',json={'message':'Show a report','patient_id':'pt-priya'}).status_code == 403


def test_doctor_scope_and_revocation(clients):
    doctor = clients['doctor']
    assert [p['id'] for p in doctor.get('/api/patients').json()] == ['pt-john']
    assert doctor.get('/api/patients/pt-priya').status_code == 403
    assert doctor.get('/api/bills').status_code == 403
    assert doctor.get('/api/patients/pt-john').status_code == 200
    assert clients['admin'].delete('/api/care-grants/grant-john').status_code == 200
    assert doctor.get('/api/patients/pt-john').status_code == 403
    assert doctor.get('/api/patients').json() == []


def test_admin_does_not_inherit_clinical_access(clients):
    admin = clients['admin']
    assert len(admin.get('/api/patients').json()) == 2
    assert admin.get('/api/patients/pt-john').status_code == 403
    assert admin.get('/api/prescriptions').json() == []
    assert all(not row['patient_id'] for row in admin.get('/api/documents').json())
    assert admin.get('/api/monitor/conversations/fake/messages').status_code == 403


def test_protected_downloads_and_denial_audit(clients, db_factory):
    with db_factory() as db:
        own = db.scalar(select(Document).where(Document.patient_id=='pt-john'))
        other = db.scalar(select(Document).where(Document.patient_id=='pt-priya'))
        own_id, other_id = own.id, other.id
    assert clients['patient'].get(f'/api/documents/{own_id}/download').status_code == 200
    response = clients['patient'].get(f'/api/documents/{other_id}/download')
    assert response.status_code == 403
    assert 'Priya' not in response.text
    assert clients['doctor'].get(f'/api/documents/{other_id}/download').status_code == 403
    assert clients['admin'].get(f'/api/documents/{own_id}/download').status_code == 403
    with db_factory() as db:
        assert db.scalar(select(AuditLog).where(AuditLog.outcome=='denied'))


def test_sessions_csrf_and_role_tampering(clients):
    patient = clients['patient']
    assert patient.post('/api/chat',json={'message':'hello','role':'admin'}).status_code == 422
    assert patient.get('/api/users').status_code == 403
    token = patient.headers.pop('x-csrf-token')
    assert patient.post('/api/notifications/read').status_code == 403
    patient.headers['x-csrf-token'] = token
    assert patient.post('/api/auth/logout').status_code == 200
    assert patient.get('/api/auth/me').status_code == 401


def test_expired_grant_and_deactivated_account(clients, db_factory):
    from datetime import timedelta
    from app.models import now
    with db_factory() as db:
        db.get(CareGrant,'grant-john').expires_at = now()-timedelta(minutes=1)
        db.commit()
    assert clients['doctor'].get('/api/patients/pt-john').status_code == 403
    assert clients['admin'].patch('/api/users/patient-1/status',json={'active':False}).status_code == 200
    assert clients['patient'].get('/api/auth/me').status_code == 401
