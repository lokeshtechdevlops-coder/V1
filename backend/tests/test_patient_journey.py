"""One persisted API journey, using only newly registered fictional identities."""
from datetime import timedelta
from fastapi.testclient import TestClient
from app.main import app
from app.models import now


def test_signup_approval_booking_consultation_report_and_billing(clients):
    admin = clients['admin']
    password = 'FictionalJourneyPassword!2026'
    with TestClient(app) as patient, TestClient(app) as doctor:
        signup = patient.post('/api/auth/signup', json={
            'name':'Journey Patient', 'email':'journey-patient@example.com',
            'password':password, 'confirm_password':password, 'role':'patient',
            'dob':'1994-03-12', 'gender':'Female'})
        assert signup.status_code == 201, signup.text
        patient_id = signup.json()['patient']['id']
        assert signup.json()['patient']['dob'] == '1994-03-12'
        assert signup.json()['patient']['gender'] == 'Female'
        patient.headers['x-csrf-token'] = signup.json()['csrf_token']
        requested = doctor.post('/api/auth/signup', json={
            'name':'Journey Doctor', 'email':'journey-doctor@example.com',
            'password':password, 'confirm_password':password, 'role':'doctor'})
        assert requested.status_code == 201 and requested.json()['status'] == 'pending'
        assert doctor.post('/api/auth/login',json={'email':'journey-doctor@example.com','password':password}).status_code == 401
        account = next(u for u in admin.get('/api/users').json() if u['email']=='journey-doctor@example.com')
        assert admin.post(f"/api/users/{account['id']}/signup-review",json={
            'approve':True,'department_id':'dept-general','specialisation':'General Medicine'}).status_code == 200
        login = doctor.post('/api/auth/login',json={'email':account['email'],'password':password})
        assert login.status_code == 200
        doctor.headers['x-csrf-token'] = login.json()['csrf_token']
        physician = next(d for d in admin.get('/api/doctors').json() if d.get('user_id')==account['id'])
        assert doctor.get(f'/api/patients/{patient_id}').status_code == 403
        grant = admin.post('/api/care-grants',json={'doctor_id':physician['id'],'patient_id':patient_id,'kind':'assigned'})
        assert grant.status_code == 200, grant.text
        slot = doctor.post('/api/slots',json={'doctor_id':physician['id'],
            'starts_at':(now()+timedelta(days=30)).isoformat(),'duration_minutes':30})
        assert slot.status_code == 200, slot.text
        booking = patient.post('/api/appointments',json={'slot_id':slot.json()['id'],'reason':'Fictional verification consultation'})
        assert booking.status_code == 200, booking.text
        appointment_id = booking.json()['id']
        assert any(a['id']==appointment_id for a in doctor.get('/api/appointments').json())
        note = doctor.post('/api/records',json={'patient_id':patient_id,
            'diagnosis':'Fictional verification assessment','notes':'Demonstration only; no clinical advice.'})
        assert note.status_code == 200, note.text
        prescription = doctor.post('/api/prescriptions',json={'patient_id':patient_id,
            'medicine':'Fictional test entry','dosage':'As documented by clinician',
            'frequency':'As documented','duration':'As documented','instructions':'Test record only.'})
        assert prescription.status_code == 200, prescription.text
        report = doctor.post('/api/documents',data={'title':'Journey consultation report',
            'audience':'private','patient_id':patient_id},files={'file':('report.txt',b'Fictional journey report.','text/plain')})
        assert report.status_code == 200, report.text
        report_id = report.json()['id']
        bill = admin.post('/api/bills',json={'patient_id':patient_id,
            'items':[{'description':'Fictional consultation','amount_paise':50000}]})
        assert bill.status_code == 200, bill.text
        bill_id = bill.json()['id']
        assert admin.post(f'/api/bills/{bill_id}/payments',json={'amount_paise':50000,'reference':'fictional-journey-payment'}).status_code == 200
        assert doctor.post(f'/api/appointments/{appointment_id}/complete').status_code == 200
        assert patient.post('/api/auth/logout').status_code == 200
        login = patient.post('/api/auth/login',json={'email':'journey-patient@example.com','password':password})
        assert login.status_code == 200
        patient.headers['x-csrf-token'] = login.json()['csrf_token']
        assert any(a['id']==appointment_id and a['status']=='completed' for a in patient.get('/api/appointments').json())
        assert any(p['id']==prescription.json()['id'] for p in patient.get('/api/prescriptions').json())
        assert any(n['id']==note.json()['id'] for n in patient.get('/api/records').json())
        assert any(b['id']==bill_id and b['status']=='paid' for b in patient.get('/api/bills').json())
        assert patient.get(f'/api/documents/{report_id}/download').content == b'Fictional journey report.'
        assert patient.get('/api/notifications').json()
        assert clients['patient'].get(f'/api/documents/{report_id}/download').status_code == 403
        assert clients['doctor'].get(f'/api/patients/{patient_id}').status_code == 403
        assert admin.get(f'/api/documents/{report_id}/download').status_code == 403
        assert admin.delete(f"/api/care-grants/{grant.json()['id']}").status_code == 200
        assert doctor.get(f'/api/documents/{report_id}/download').status_code == 403
