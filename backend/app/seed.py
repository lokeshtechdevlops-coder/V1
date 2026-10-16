"""Explicit fictional demo data. Never executed automatically on server startup."""
from datetime import timedelta
from io import BytesIO
from starlette.datastructures import UploadFile
from sqlalchemy import select
from app.core.database import SessionLocal
from app.core.config import get_settings
from app.core.security import passwords
from app.models import *
from app.services.storage import store
from app.rag.retrieval import process_document

DEMO_PASSWORD = 'DemoHospital!2026'
ADMIN_PERMISSIONS = ['manage_users', 'manage_patients', 'manage_doctors', 'manage_grants',
                     'manage_appointments', 'manage_documents', 'manage_pharmacy', 'billing',
                     'manage_notifications', 'audit', 'monitor', 'restricted_documents']


def seed(db):
    if db.scalar(select(User).limit(1)):
        return False
    users = [User(id='patient-1', email='patient@carenexus.local', name='John Doe', role='patient', password_hash=passwords.hash(DEMO_PASSWORD)),
             User(id='patient-2', email='patient2@carenexus.local', name='Priya Rao', role='patient', password_hash=passwords.hash(DEMO_PASSWORD)),
             User(id='doctor-1', email='doctor@carenexus.local', name='Dr. Sarah Lin', role='doctor', password_hash=passwords.hash(DEMO_PASSWORD)),
             User(id='doctor-2', email='doctor2@carenexus.local', name='Dr. Arun Mehta', role='doctor', password_hash=passwords.hash(DEMO_PASSWORD)),
             User(id='admin-1', email='admin@carenexus.local', name='Marcus Vance', role='admin', password_hash=passwords.hash(DEMO_PASSWORD), permissions=ADMIN_PERMISSIONS)]
    db.add_all(users)
    db.flush()
    db.add_all([Department(id='dept-cardio', name='Cardiology', description='Cardiac outpatient services'),
                Department(id='dept-general', name='General Medicine', description='General consultations')])
    db.flush()
    db.add_all([Patient(id='pt-john', user_id='patient-1', mrn='MRN-90214', dob='1980-05-12', gender='Male'),
                Patient(id='pt-priya', user_id='patient-2', mrn='MRN-90215', dob='1993-11-04', gender='Female'),
                Doctor(id='dr-sarah', user_id='doctor-1', department_id='dept-cardio', specialisation='Cardiology', bio='Cardiology consultant'),
                Doctor(id='dr-arun', user_id='doctor-2', department_id='dept-general', specialisation='General Medicine', bio='General medicine consultant')])
    db.flush()
    db.add_all([CareGrant(id='grant-john', doctor_id='dr-sarah', patient_id='pt-john'),
                CareGrant(id='grant-priya', doctor_id='dr-arun', patient_id='pt-priya')])
    start = (now() + timedelta(days=1)).replace(hour=4, minute=0, second=0, microsecond=0)
    for doctor_id in ['dr-sarah', 'dr-arun']:
        for day in range(7):
            for n in range(4):
                db.add(Slot(id=f'{doctor_id}-{day}-{n}', doctor_id=doctor_id,
                            starts_at=start + timedelta(days=day, minutes=n * 30)))
    db.flush()
    db.add(Appointment(id='apt-john', patient_id='pt-john', slot_id='dr-sarah-0-0', reservation_slot_id='dr-sarah-0-0', reason='Follow-up consultation'))
    db.add_all([Medicine(id='med-1', name='Paracetamol 500 mg', description='Approved formulary entry. Follow your clinician’s instructions.', stock=120),
                Medicine(id='med-2', name='Atorvastatin 20 mg', description='Prescription medicine; dispense against a valid prescription.', stock=12)])
    db.add(Prescription(id='rx-john', patient_id='pt-john', doctor_id='dr-sarah', medicine='Atorvastatin', dosage='20 mg', frequency='Once daily', duration='30 days', instructions='Fictional demonstration prescription.'))
    db.add(MedicalRecord(id='record-john', patient_id='pt-john', doctor_id='dr-sarah', diagnosis='Fictional follow-up visit', notes='Demonstration clinical note recorded by the assigned doctor.'))
    db.add(Bill(id='bill-john', patient_id='pt-john', items=[{'description': 'Consultation', 'amount_paise': 80000}], total_paise=80000))
    db.add(Notification(user_id='patient-1', title='Welcome to CareNexus', message='Your fictional demo account is ready.'))
    for doctor, patient_id, title, text in [
        (users[2], 'pt-john', 'John laboratory report', 'Fictional report for John Doe. Laboratory values are available for clinician review.'),
        (users[3], 'pt-priya', 'Priya private report', 'PRIVATE-PRIYA-ONLY: Fictional clinical record for Priya Rao.')]:
        upload = UploadFile(filename='report.txt', file=BytesIO(text.encode()))
        store(db, doctor, upload, title, 'laboratory', 'private', patient_id)
    admin = users[4]
    for title, audience, text in [
        ('Hospital visiting hours', 'public', 'Hospital visiting hours are 4 PM to 6 PM daily. Bring one visitor pass. Appointment cancellations are permitted before the scheduled start time.'),
        ('Doctor handover policy', 'doctor', 'DOCTOR-ONLY-HANDOVER: Doctors must document the patient handover in the authorised clinical record.'),
        ('Administrative billing policy', 'admin', 'ADMIN-ONLY-BILLING: Record payment references and keep an audit trail.')]:
        doc = store(db, admin, UploadFile(filename='policy.txt', file=BytesIO(text.encode())), title, 'policy', audience)
        # Server initialization must not depend on external indexing credentials.
        # In NIM mode, explicitly process these uploads from Knowledge base after setup.
        if get_settings().ai_mode == 'demo':
            process_document(db, admin, doc)
    db.commit()
    return True


if __name__ == '__main__':
    with SessionLocal() as db:
        print('Fictional demo data created.' if seed(db) else 'Database already contains users; seed skipped.')
