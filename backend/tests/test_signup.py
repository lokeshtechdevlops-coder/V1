from datetime import date, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import select
from app.main import app
from app.models import User, Patient


def payload(email='newpatient@example.com'):
    return {'name':'New Patient','email':email,'password':'StrongPatientPassword!2026',
            'confirm_password':'StrongPatientPassword!2026','dob':'1990-01-01','phone':'1234567890'}


def test_signup_creates_isolated_patient_and_session(clients,db_factory):
    with TestClient(app) as client:
        response=client.post('/api/auth/signup',json=payload(' NEWPATIENT@EXAMPLE.COM '))
        assert response.status_code==201,response.text
        result=response.json()
        assert result['user']['role']=='patient'
        account_id = result['user']['account_id']
        assert account_id.startswith('pat-') and len(account_id) == 12
        assert result['user']['permissions']==[]
        assert 'password_hash' not in result['user']
        assert client.get('/api/auth/me').status_code==200
        assert client.get('/api/auth/me').json()['user']['account_id'] == account_id
        patients=client.get('/api/patients').json()
        assert len(patients)==1 and patients[0]['id']==result['patient']['id']
        assert client.get('/api/patients/pt-john').status_code==403
        assert client.get('/api/users').status_code==403
        assert client.get('/api/records').json()==[]
        client.headers['x-csrf-token']=result['csrf_token']
        assert client.post('/api/auth/logout').status_code==200
        assert client.post('/api/auth/login',json={'email':'newpatient@example.com','password':payload()['password']}).status_code==200
    with db_factory() as db:
        user=db.scalar(select(User).where(User.email=='newpatient@example.com'))
        assert user.password_hash!=payload()['password']
        assert user.account_id == account_id
        assert db.scalar(select(Patient).where(Patient.user_id==user.id)).mrn.startswith('MRN-')


def test_signup_rejects_privilege_fields_and_invalid_input(clients):
    with TestClient(app) as client:
        for injected in [{'role':'superadmin'},{'permissions':['clinical_records']},{'mrn':'MRN-90214'},{'patient_id':'pt-john'},{'account_id':'adm-forged'}]:
            assert client.post('/api/auth/signup',json=payload()|injected).status_code==422
        assert client.post('/api/auth/signup',json=payload()|{'confirm_password':'DifferentPassword!2026'}).status_code==422
        assert client.post('/api/auth/signup',json=payload()|{'email':'invalid'}).status_code==422
        assert client.post('/api/auth/signup',json=payload()|{'name':'   '}).status_code==422
        assert client.post('/api/auth/signup',json=payload()|{'dob':(date.today()+timedelta(days=2)).isoformat()}).status_code==422
        assert client.post('/api/auth/signup',json=payload(),headers={'origin':'https://untrusted.example'}).status_code==403


def test_duplicate_signup_does_not_change_existing_account(clients,db_factory):
    with TestClient(app) as client:
        response=client.post('/api/auth/signup',json=payload(' PATIENT@CAREnexus.local '))
        assert response.status_code==409
        assert client.get('/api/auth/me').status_code==401
    with db_factory() as db:
        users=db.scalars(select(User).where(User.email=='patient@carenexus.local')).all()
        assert len(users)==1 and users[0].id=='patient-1'


def test_staff_role_requires_admin_review(clients):
    admin=clients['admin']
    for role in ['doctor','admin']:
        email=f'new-{role}@example.com'
        with TestClient(app) as client:
            response=client.post('/api/auth/signup',json=payload(email)|{'role':role})
            assert response.status_code==201,response.text
            assert response.json()['status']=='pending'
            account_id = response.json()['account_id']
            assert account_id.startswith({'doctor': 'doc-', 'admin': 'adm-'}[role])
            assert len(account_id) == 12
            assert client.get('/api/auth/me').status_code==401
            assert client.post('/api/auth/login',json={'email':email,'password':payload()['password']}).status_code==401
            account=next(u for u in admin.get('/api/users').json() if u['email']==email)
            assert not account['active'] and account['permissions']==[]
            assert account['account_id'] == account_id
            assert admin.patch(f"/api/users/{account['id']}/status",json={'active':True}).status_code==409
            review={'approve':True}
            if role=='doctor':review|={'department_id':'dept-cardio','specialisation':'Cardiology'}
            assert admin.post(f"/api/users/{account['id']}/signup-review",json=review).status_code==200
            login=client.post('/api/auth/login',json={'email':email,'password':payload()['password']})
            assert login.status_code==200,login.text
            assert login.json()['user']['role']==role
            assert login.json()['user']['account_id'] == account_id
            assert 'clinical_records' not in login.json()['user']['permissions']
            if role=='doctor':assert client.get('/api/patients').json()==[]


def test_patient_cannot_review_staff_request(clients):
    with TestClient(app) as client:
        assert client.post('/api/auth/signup',json=payload('review-doctor@example.com')|{'role':'doctor'}).status_code==201
    account=next(u for u in clients['admin'].get('/api/users').json() if u['email']=='review-doctor@example.com')
    path=f"/api/users/{account['id']}/signup-review"
    assert clients['patient'].post(path,json={'approve':True}).status_code==403
    assert clients['admin'].post(path,json={'approve':False}).status_code==200
    assert clients['admin'].post(path,json={'approve':True}).status_code==409
