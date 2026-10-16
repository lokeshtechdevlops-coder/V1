from datetime import timedelta
from app.models import now


def test_admin_registration_clinician_records_and_billing(clients):
    admin,doctor,patient=clients['admin'],clients['doctor'],clients['patient']
    created=admin.post('/api/users',json={'name':'Test Patient','email':'test@carenexus.local',
        'password':'TemporaryPassword!2026','role':'patient','mrn':'MRN-TEST','dob':'1990-01-01','gender':'Female'})
    assert created.status_code==200,created.text
    patient_id=created.json()['record']['id']
    assert doctor.get(f'/api/patients/{patient_id}').status_code==403
    assert admin.post('/api/care-grants',json={'patient_id':patient_id,'doctor_id':'dr-sarah','kind':'consult'}).status_code==200
    assert doctor.get(f'/api/patients/{patient_id}').status_code==200
    rx=doctor.post('/api/prescriptions',json={'patient_id':patient_id,'medicine':'Test medicine',
        'dosage':'As instructed','frequency':'As recorded','duration':'1 day','instructions':'Fictional test only.'})
    assert rx.status_code==200,rx.text
    assert patient.get(f'/api/prescriptions?patient_id={patient_id}').status_code==403
    bill=admin.post('/api/bills',json={'patient_id':patient_id,'items':[{'description':'Test consultation','amount_paise':50000}]})
    assert bill.status_code==200,bill.text
    bill_id=bill.json()['id']
    assert admin.post(f'/api/bills/{bill_id}/payments',json={'amount_paise':60000,'reference':'too-much'}).status_code==409
    paid=admin.post(f'/api/bills/{bill_id}/payments',json={'amount_paise':50000,'reference':'test-payment-reference'})
    assert paid.status_code==200,paid.text
    assert next(b for b in admin.get('/api/bills').json() if b['id']==bill_id)['status']=='paid'
    assert all(b['id']!=bill_id for b in patient.get('/api/bills').json())


def test_notifications_inventory_and_overlapping_availability(clients):
    admin,doctor,patient=clients['admin'],clients['doctor'],clients['patient']
    announcement=admin.post('/api/notifications/broadcast',json={'audience':'doctor','title':'Doctor-only announcement','message':'Test announcement.'})
    assert announcement.status_code==200
    assert any(n['title']=='Doctor-only announcement' for n in doctor.get('/api/notifications').json())
    assert all(n['title']!='Doctor-only announcement' for n in patient.get('/api/notifications').json())
    medicine={'name':'Test medicine','description':'Test formulary entry','stock':10,'low_stock_threshold':5}
    assert patient.post('/api/medicines',json=medicine).status_code==403
    assert admin.post('/api/medicines',json=medicine).status_code==200
    start=now()+timedelta(days=20)
    slot={'doctor_id':'dr-sarah','starts_at':start.isoformat(),'duration_minutes':30}
    assert doctor.post('/api/slots',json=slot).status_code==200
    slot['starts_at']=(start+timedelta(minutes=15)).isoformat()
    assert doctor.post('/api/slots',json=slot).status_code==409
    assert patient.post('/api/slots',json=slot).status_code==403


def test_slot_times_use_utc_api_contract(clients):
    from datetime import timezone
    doctor=clients['doctor']
    start=(now()+timedelta(days=25)).astimezone(timezone(timedelta(hours=5,minutes=30)))
    response=doctor.post('/api/slots',json={'doctor_id':'dr-sarah','starts_at':start.isoformat(),'duration_minutes':30})
    assert response.status_code==200,response.text
    slot_id=response.json()['id']
    rows=doctor.get('/api/slots').json()
    value=next(row['starts_at'] for row in rows if row['id']==slot_id)
    from datetime import datetime
    assert datetime.fromisoformat(value).astimezone(timezone.utc)==start.astimezone(timezone.utc)
    appointment=clients['patient'].get('/api/appointments').json()[0]
    assert datetime.fromisoformat(appointment['starts_at']).tzinfo is not None
