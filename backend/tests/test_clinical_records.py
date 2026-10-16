def test_clinical_records_and_patient_update(clients):
    patient,doctor,admin=clients['patient'],clients['doctor'],clients['admin']
    assert [r['patient_id'] for r in patient.get('/api/records').json()]==['pt-john']
    assert doctor.get('/api/records?patient_id=pt-priya').status_code==403
    assert admin.get('/api/records').json()==[]
    data={'patient_id':'pt-john','diagnosis':'Fictional follow-up','notes':'Clinician entered test note.'}
    assert patient.post('/api/records',json=data).status_code==403
    assert doctor.post('/api/records',json=data).status_code==200
    assert any(r['notes']==data['notes'] for r in patient.get('/api/records').json())
    assert admin.patch('/api/patients/pt-john',json={'name':'John Doe','phone':'1234567890','dob':'1980-05-12','gender':'Male'}).status_code==200
