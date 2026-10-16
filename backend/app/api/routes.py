from datetime import timedelta
from threading import Lock
from time import monotonic
from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, Response, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import select, or_, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import current_user, issue_session, passwords, DUMMY_HASH, aware
from app.models import *
from app.schemas.requests import *
from app.services.access import *
from app.services.hospital import book, cancel, reschedule, prescribe, appointment_access, notify
from app.services.serialization import public_row, user_row, document_row
from app.services.storage import store, document_path
from app.services.actions import propose, confirm
from app.rag.retrieval import process_document

router = APIRouter(prefix='/api')
DB = Depends(get_db)
USER = Depends(current_user)
attempts = {}
attempts_lock = Lock()


def auth_throttle(request, category):
    key = category + ':' + (request.client.host if request.client else 'local')
    with attempts_lock:
        timestamp = monotonic()
        # Bounded, process-local development throttle. Do not trust forwarded IP headers.
        for old_key in list(attempts):
            attempts[old_key] = [t for t in attempts[old_key] if timestamp - t < 60]
            if not attempts[old_key]:
                del attempts[old_key]
        recent = attempts.setdefault(key, [])
        if len(recent) >= (5 if category == 'signup' else 20):
            raise HTTPException(429, 'Too many attempts. Try again in one minute.')
        recent.append(timestamp)


@router.post('/auth/signup', status_code=201)
def signup(data: PatientSignup, request: Request, response: Response, db: Session = DB):
    auth_throttle(request, 'signup')
    settings = get_settings()
    if request.headers.get('origin') not in {None, settings.frontend_origin}:
        raise HTTPException(403, 'Request origin is not allowed.')
    # Role selection requests staff access; approval is required before that access exists.
    # Never accept permissions, MRNs or existing patient IDs from self-registration.
    account = User(name=data.name, email=data.email, phone=data.phone,
                   role=data.role, active=data.role == 'patient',
                   signup_status='approved' if data.role == 'patient' else 'pending',
                   permissions=[], password_hash=passwords.hash(data.password))
    try:
        db.add(account)
        db.flush()
        if data.role != 'patient':
            audit(db, account, 'staff.signup.request', account.id)
            db.commit()
            return {'status': 'pending', 'requested_role': data.role, 'account_id': account.account_id,
                    'message': 'Your signup request was submitted. Hospital administration must approve staff access before you can sign in.'}
        patient = Patient(user_id=account.id, mrn='MRN-' + uid().replace('-', '')[:12].upper(),
                          dob=data.dob.isoformat() if data.dob else '', gender=data.gender)
        db.add(patient)
        db.flush()
        session, token = issue_session(db, account)
        audit(db, account, 'patient.signup', patient.id)
        notify(db, account.id, 'Welcome to CareNexus', 'Your patient account is ready.')
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, 'An account could not be created with these details. Try signing in or use another email.')
    response.set_cookie('hospital_session', token, httponly=True, secure=settings.cookie_secure,
                        samesite='lax', max_age=settings.session_minutes * 60, path='/')
    return {'user': user_row(account), 'csrf_token': session.csrf_token, 'patient': public_row(patient)}


@router.post('/auth/login')
def login(data: Login, request: Request, response: Response, db: Session = DB):
    auth_throttle(request, 'login')
    user = db.scalar(select(User).where(User.email == data.email.strip().lower()))
    valid = passwords.verify(data.password, user.password_hash if user else DUMMY_HASH)
    if not user or not valid or not user.active:
        raise HTTPException(401, 'Invalid email or password.')
    if request.headers.get('origin') not in {None, get_settings().frontend_origin}:
        raise HTTPException(403, 'Request origin is not allowed.')
    session, token = issue_session(db, user)
    audit(db, user, 'session.login', session.id)
    db.commit()
    response.set_cookie('hospital_session', token, httponly=True, secure=get_settings().cookie_secure,
                        samesite='lax', max_age=get_settings().session_minutes * 60, path='/')
    return {'user': user_row(user), 'csrf_token': session.csrf_token}


@router.get('/auth/me')
def me(request: Request, user: User = USER):
    return {'user': user_row(user), 'csrf_token': request.state.auth_session.csrf_token}


@router.post('/auth/logout')
def logout(request: Request, response: Response, db: Session = DB, user: User = USER):
    request.state.auth_session.revoked = True
    audit(db, user, 'session.logout', request.state.auth_session.id)
    db.commit()
    response.delete_cookie('hospital_session', path='/')
    return {'ok': True}


@router.patch('/profile')
def profile(data: ProfileUpdate, db: Session = DB, user: User = USER):
    user.name, user.phone = data.name, data.phone
    audit(db, user, 'profile.update', user.id)
    db.commit()
    return user_row(user)


@router.get('/departments')
def departments(db: Session = DB, user: User = USER):
    return [public_row(row) for row in db.scalars(select(Department).order_by(Department.name))]


@router.post('/departments')
def create_department(data: DepartmentInput, db: Session = DB, user: User = USER):
    require_permission(db, user, 'manage_doctors')
    item = Department(**data.model_dump())
    db.add(item)
    db.flush()
    audit(db, user, 'department.create', item.id)
    db.commit()
    return public_row(item)


@router.patch('/departments/{department_id}')
def update_department(department_id: str, data: DepartmentInput, db: Session = DB, user: User = USER):
    require_permission(db, user, 'manage_doctors')
    item = db.get(Department, department_id)
    if not item:
        raise HTTPException(404, 'Department unavailable.')
    item.name, item.description = data.name, data.description
    audit(db, user, 'department.update', item.id)
    db.commit()
    return public_row(item)


@router.get('/users')
def users(db: Session = DB, user: User = USER):
    require_permission(db, user, 'manage_users')
    return [user_row(row) for row in db.scalars(select(User).order_by(User.name))]


@router.post('/users')
def register(data: RegisterUser, db: Session = DB, user: User = USER):
    require_permission(db, user, 'manage_users')
    if data.role == 'patient' and not data.mrn:
        raise HTTPException(422, 'MRN is required.')
    if data.role == 'doctor' and (not data.department_id or not db.get(Department, data.department_id) or not data.specialisation):
        raise HTTPException(422, 'Select a valid department and specialisation.')
    account = User(name=data.name, email=data.email.strip().lower(), password_hash=passwords.hash(data.password), role=data.role)
    db.add(account)
    db.flush()
    if data.role == 'patient':
        record = Patient(user_id=account.id, mrn=data.mrn, dob=data.dob, gender=data.gender)
    else:
        record = Doctor(user_id=account.id, department_id=data.department_id, specialisation=data.specialisation)
    db.add(record)
    db.flush()
    audit(db, user, 'user.create', account.id)
    db.commit()
    return {'user': user_row(account), 'record': public_row(record)}


@router.patch('/users/{user_id}/status')
def status(user_id: str, data: UserStatus, db: Session = DB, user: User = USER):
    require_permission(db, user, 'manage_users')
    account = db.get(User, user_id)
    if not account or account.id == user.id:
        raise HTTPException(422, 'Cannot change this account status.')
    if account.signup_status != 'approved':
        raise HTTPException(409, 'Review the signup request before activating this account.')
    account.active = data.active
    if not data.active:
        for session in db.scalars(select(AuthSession).where(AuthSession.user_id == user_id)):
            session.revoked = True
    audit(db, user, 'user.status', account.id)
    db.commit()
    return user_row(account)


@router.post('/users/{user_id}/signup-review')
def review_signup(user_id: str, data: SignupReview, db: Session = DB, user: User = USER):
    require_permission(db, user, 'manage_users')
    account = db.scalar(select(User).where(User.id == user_id).with_for_update())
    if not account or account.signup_status != 'pending' or account.role not in {'doctor', 'admin'}:
        raise HTTPException(409, 'This signup request is unavailable or has already been reviewed.')
    if data.approve:
        if account.role == 'doctor':
            if not data.department_id or not db.get(Department, data.department_id) or not data.specialisation.strip():
                raise HTTPException(422, 'Assign a department and specialisation before approving a doctor.')
            db.add(Doctor(user_id=account.id, department_id=data.department_id, specialisation=data.specialisation.strip()))
        else:
            # Operational admin rights; clinical access remains a separate explicit grant.
            account.permissions = ['manage_users', 'manage_patients', 'manage_doctors', 'manage_grants',
                'manage_appointments', 'manage_documents', 'manage_pharmacy', 'billing',
                'manage_notifications', 'audit', 'monitor', 'restricted_documents']
        account.active = True
        account.signup_status = 'approved'
        notify(db, account.id, 'Account approved', 'Hospital administration approved your staff account.')
    else:
        account.active = False
        account.signup_status = 'rejected'
    audit(db, user, 'staff.signup.approve' if data.approve else 'staff.signup.reject', account.id)
    db.commit()
    return user_row(account)


def list_patients(db, user):
    result = []
    clinical = user.role != 'admin'
    for patient in db.scalars(select(Patient).where(patient_scope(db, user, clinical))):
        account = db.get(User, patient.user_id)
        result.append({**public_row(patient), 'name': account.name, 'phone': account.phone, 'account_id': account.account_id})
        audit(db, user, 'patient.read', patient.id)
    return result


@router.get('/patients')
def patients(db: Session = DB, user: User = USER):
    result = list_patients(db, user)
    db.commit()
    return result


@router.get('/patients/{patient_id}')
def patient_detail(patient_id: str, db: Session = DB, user: User = USER):
    patient = require_patient(db, user, patient_id)
    audit(db, user, 'patient.read', patient.id)
    db.commit()
    return {**public_row(patient), 'name': db.get(User, patient.user_id).name}


def list_doctors(db, user):
    result = []
    for doctor in db.scalars(select(Doctor)):
        account = db.get(User, doctor.user_id)
        if not account.active:
            continue
        result.append({'id': doctor.id, 'name': account.name, 'account_id': account.account_id,
                       'department_id': doctor.department_id,
                       'department': db.get(Department, doctor.department_id).name,
                       'specialisation': doctor.specialisation, 'bio': doctor.bio,
                       **({'email': account.email, 'phone': account.phone, 'user_id': account.id}
                          if account.id == user.id or 'manage_doctors' in user.permissions else {})})
    return result


@router.get('/doctors')
def doctors(db: Session = DB, user: User = USER):
    return list_doctors(db, user)


@router.patch('/patients/{patient_id}')
def patient_update(patient_id: str, data: PatientUpdate, db: Session = DB, user: User = USER):
    require_permission(db, user, 'manage_patients')
    patient = require_patient(db, user, patient_id, clinical=False)
    account = db.get(User, patient.user_id)
    account.name, account.phone = data.name, data.phone
    patient.dob, patient.gender = data.dob, data.gender
    audit(db, user, 'patient.update', patient.id)
    db.commit()
    return {'ok': True}


def list_records(db, user, patient_id=None):
    stmt = select(MedicalRecord).where(MedicalRecord.patient_id.in_(permitted_patient_ids(db, user)))
    if patient_id:
        require_patient(db, user, patient_id)
        stmt = stmt.where(MedicalRecord.patient_id == patient_id)
    rows = []
    for record in db.scalars(stmt.order_by(MedicalRecord.created_at.desc())):
        rows.append(public_row(record))
        audit(db, user, 'medical_record.read', record.id)
    return rows


@router.get('/records')
def records(patient_id: str | None = None, db: Session = DB, user: User = USER):
    rows = list_records(db, user, patient_id)
    db.commit()
    return rows


@router.post('/records')
def record_create(data: MedicalRecordInput, db: Session = DB, user: User = USER):
    doctor = doctor_for(db, user)
    if not doctor:
        deny(db, user)
    require_patient(db, user, data.patient_id)
    row = MedicalRecord(doctor_id=doctor.id, **data.model_dump())
    db.add(row)
    db.flush()
    audit(db, user, 'medical_record.create', row.id)
    db.commit()
    return public_row(row)


@router.patch('/doctors/{doctor_id}')
def doctor_update(doctor_id: str, data: DoctorUpdate, db: Session = DB, user: User = USER):
    doctor = db.get(Doctor, doctor_id)
    if not doctor or (doctor.user_id != user.id and 'manage_doctors' not in user.permissions):
        deny(db, user)
    doctor.specialisation, doctor.bio = data.specialisation, data.bio
    audit(db, user, 'doctor.update', doctor.id)
    db.commit()
    return {'ok': True}


@router.get('/care-grants')
def grants(db: Session = DB, user: User = USER):
    require_permission(db, user, 'manage_grants')
    return [public_row(row) for row in db.scalars(select(CareGrant))]


@router.post('/care-grants')
def create_grant(data: GrantInput, db: Session = DB, user: User = USER):
    require_permission(db, user, 'manage_grants')
    if not db.get(Patient, data.patient_id) or not db.get(Doctor, data.doctor_id):
        raise HTTPException(422, 'Select a valid patient and doctor.')
    if data.expires_at and (data.expires_at.tzinfo is None or data.expires_at <= now()):
        raise HTTPException(422, 'Expiry must be a future timezone-aware timestamp.')
    item = CareGrant(**data.model_dump())
    db.add(item)
    db.flush()
    audit(db, user, 'grant.create', item.id)
    db.commit()
    return public_row(item)


@router.delete('/care-grants/{grant_id}')
def revoke_grant(grant_id: str, db: Session = DB, user: User = USER):
    require_permission(db, user, 'manage_grants')
    grant = db.scalar(select(CareGrant).where(CareGrant.id == grant_id).with_for_update())
    if not grant:
        raise HTTPException(404, 'Grant unavailable.')
    grant.active = False
    audit(db, user, 'grant.revoke', grant.id)
    db.commit()
    return {'ok': True}


def list_slots(db, doctor_id=None, include_booked=False):
    stmt = select(Slot).join(Doctor, Slot.doctor_id == Doctor.id).join(User, Doctor.user_id == User.id).where(
        Slot.active.is_(True), Slot.starts_at > now(), User.active.is_(True))
    if doctor_id:
        stmt = stmt.where(Slot.doctor_id == doctor_id)
    if not include_booked:
        stmt = stmt.where(~Slot.id.in_(select(Appointment.reservation_slot_id).where(Appointment.reservation_slot_id.is_not(None))))
    return [public_row(row) for row in db.scalars(stmt.order_by(Slot.starts_at))]


@router.get('/slots')
def slots(doctor_id: str | None = None, db: Session = DB, user: User = USER):
    return list_slots(db, doctor_id)


@router.get('/availability')
def availability(db: Session = DB, user: User = USER):
    if user.role == 'doctor':
        doctor = doctor_for(db, user)
        return list_slots(db, doctor.id, True)
    require_permission(db, user, 'manage_doctors')
    return list_slots(db, include_booked=True)


@router.post('/slots')
def create_slot(data: SlotInput, db: Session = DB, user: User = USER):
    doctor = db.get(Doctor, data.doctor_id)
    if not doctor or (doctor.user_id != user.id and 'manage_doctors' not in user.permissions):
        deny(db, user)
    if data.starts_at.tzinfo is None or data.starts_at <= now():
        raise HTTPException(422, 'Choose a future timezone-aware slot time.')
    # Lock the doctor row to serialize availability creation, including overlapping intervals.
    db.scalar(select(Doctor).where(Doctor.id == doctor.id).with_for_update())
    end = data.starts_at + timedelta(minutes=data.duration_minutes)
    for existing in db.scalars(select(Slot).where(Slot.doctor_id == doctor.id, Slot.active.is_(True), Slot.starts_at < end)):
        if aware(existing.starts_at) + timedelta(minutes=existing.duration_minutes) > data.starts_at:
            raise HTTPException(409, 'Availability overlaps an existing slot.')
    item = Slot(**data.model_dump())
    db.add(item)
    db.flush()
    audit(db, user, 'slot.create', item.id)
    db.commit()
    return public_row(item)


@router.delete('/slots/{slot_id}')
def remove_slot(slot_id: str, db: Session = DB, user: User = USER):
    slot = db.scalar(select(Slot).where(Slot.id == slot_id).with_for_update())
    if not slot or (db.get(Doctor, slot.doctor_id).user_id != user.id and 'manage_doctors' not in user.permissions):
        deny(db, user)
    if db.scalar(select(Appointment.id).where(Appointment.reservation_slot_id == slot_id)):
        raise HTTPException(409, 'Cancel or reschedule the appointment before removing this slot.')
    slot.active = False
    audit(db, user, 'slot.remove', slot.id)
    db.commit()
    return {'ok': True}


def list_appointments(db, user):
    stmt = select(Appointment)
    if user.role == 'doctor':
        doctor = doctor_for(db, user)
        stmt = stmt.join(Slot, Slot.id == Appointment.slot_id).where(Slot.doctor_id == doctor.id,
            Appointment.patient_id.in_(permitted_patient_ids(db, user)))
    elif user.role == 'admin':
        require_permission(db, user, 'manage_appointments')
    else:
        stmt = stmt.where(Appointment.patient_id.in_(permitted_patient_ids(db, user)))
    result = []
    for apt in db.scalars(stmt.order_by(Appointment.created_at.desc())):
        slot = db.get(Slot, apt.slot_id)
        doctor = db.get(Doctor, slot.doctor_id)
        patient = db.get(Patient, apt.patient_id)
        result.append({**public_row(apt), 'starts_at': aware(slot.starts_at), 'doctor_id': doctor.id,
                       'doctor_name': db.get(User, doctor.user_id).name, 'patient_name': db.get(User, patient.user_id).name})
        audit(db, user, 'appointment.read', apt.id)
    return result


@router.get('/appointments')
def appointments(db: Session = DB, user: User = USER):
    result = list_appointments(db, user)
    db.commit()
    return result


@router.post('/appointments')
def booking(data: AppointmentInput, db: Session = DB, user: User = USER):
    item = book(db, user, data)
    db.commit()
    return public_row(item)


@router.post('/appointments/{appointment_id}/cancel')
def cancellation(appointment_id: str, db: Session = DB, user: User = USER):
    item = cancel(db, user, appointment_id)
    db.commit()
    return public_row(item)


@router.post('/appointments/{appointment_id}/reschedule')
def rescheduling(appointment_id: str, data: RescheduleInput, db: Session = DB, user: User = USER):
    item = reschedule(db, user, appointment_id, data.slot_id)
    db.commit()
    return public_row(item)


@router.post('/appointments/{appointment_id}/complete')
def complete(appointment_id: str, db: Session = DB, user: User = USER):
    if user.role == 'patient':
        deny(db, user)
    apt = appointment_access(db, user, appointment_id)
    apt = db.scalar(select(Appointment).where(Appointment.id == apt.id).with_for_update())
    if apt.status != 'confirmed':
        raise HTTPException(409, 'Only confirmed appointments can be completed.')
    apt.status = 'completed'
    audit(db, user, 'appointment.complete', apt.id)
    db.commit()
    return public_row(apt)


def list_prescriptions(db, user, patient_id=None):
    stmt = select(Prescription).where(Prescription.patient_id.in_(permitted_patient_ids(db, user)))
    if patient_id:
        require_patient(db, user, patient_id)
        stmt = stmt.where(Prescription.patient_id == patient_id)
    result = []
    for rx in db.scalars(stmt.order_by(Prescription.created_at.desc())):
        result.append(public_row(rx))
        audit(db, user, 'prescription.read', rx.id)
    return result


@router.get('/prescriptions')
def prescriptions(patient_id: str | None = None, db: Session = DB, user: User = USER):
    result = list_prescriptions(db, user, patient_id)
    db.commit()
    return result


@router.post('/prescriptions')
def prescription_create(data: PrescriptionInput, db: Session = DB, user: User = USER):
    item = prescribe(db, user, data)
    db.commit()
    return public_row(item)


def list_documents(db, user, patient_id=None, knowledge_only=False):
    stmt = select(Document).where(Document.active.is_(True), document_scope(db, user))
    if patient_id:
        require_patient(db, user, patient_id)
        stmt = stmt.where(Document.patient_id == patient_id)
    elif knowledge_only:
        stmt = stmt.where(Document.patient_id.is_(None))
    result = []
    for doc in db.scalars(stmt.order_by(Document.created_at.desc())):
        result.append(document_row(doc))
        audit(db, user, 'document.read', doc.id)
    return result


@router.get('/documents')
def documents(patient_id: str | None = None, db: Session = DB, user: User = USER):
    result = list_documents(db, user, patient_id)
    db.commit()
    return result


@router.get('/admin/documents')
def kb_documents(db: Session = DB, user: User = USER):
    require_permission(db, user, 'manage_documents')
    return [document_row(doc) for doc in db.scalars(select(Document).where(Document.patient_id.is_(None)))]


@router.post('/documents')
def upload_document(file: UploadFile = File(...), title: str = Form(...), category: str = Form('report'),
                    audience: str = Form('private'), patient_id: str | None = Form(None), version: str = Form('1'),
                    db: Session = DB, user: User = USER):
    doc = store(db, user, file, title, category, audience, patient_id, version)
    db.commit()
    return document_row(doc)


@router.get('/documents/{document_id}/download')
def download(document_id: str, db: Session = DB, user: User = USER):
    doc = require_document(db, user, document_id)
    path = document_path(doc)
    audit(db, user, 'document.download', doc.id)
    db.commit()
    return FileResponse(path, media_type=doc.mime, filename=doc.filename, content_disposition_type='attachment',
                        headers={'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff'})


def manageable_document(db, user, doc_id):
    doc = db.get(Document, doc_id)
    if not doc:
        deny(db, user)
    if doc.patient_id:
        if user.role == 'patient':
            deny(db, user)
        require_patient(db, user, doc.patient_id)
    else:
        require_permission(db, user, 'manage_documents')
    return doc


@router.patch('/documents/{document_id}/active')
def document_status(document_id: str, data: ActiveInput, db: Session = DB, user: User = USER):
    doc = manageable_document(db, user, document_id)
    doc.active = data.active
    audit(db, user, 'document.active', doc.id)
    db.commit()
    return document_row(doc)


@router.post('/documents/{document_id}/process')
def process(document_id: str, db: Session = DB, user: User = USER):
    doc = manageable_document(db, user, document_id)
    if not doc.active:
        raise HTTPException(409, 'Activate the document before indexing.')
    # Row lock serializes explicit indexing requests; no worker or Redis required.
    doc = db.scalar(select(Document).where(Document.id == doc.id).with_for_update())
    try:
        count = process_document(db, user, doc)
        db.commit()
        return {'chunks': count, 'status': 'indexed'}
    except Exception as exc:
        db.rollback()
        doc = db.get(Document, document_id)
        doc.processing_status = 'failed'
        doc.processing_error = type(exc).__name__
        db.commit()
        if isinstance(exc, HTTPException):
            raise
        raise HTTPException(502, 'Document processing failed. Check the file and model configuration, then retry.')


@router.get('/medicines')
def medicines(db: Session = DB, user: User = USER):
    return [public_row(row) for row in db.scalars(select(Medicine).order_by(Medicine.name))]


@router.post('/medicines')
def medicine_create(data: MedicineInput, db: Session = DB, user: User = USER):
    require_permission(db, user, 'manage_pharmacy')
    item = Medicine(**data.model_dump())
    db.add(item)
    db.flush()
    audit(db, user, 'medicine.create', item.id)
    db.commit()
    return public_row(item)


@router.patch('/medicines/{medicine_id}')
def medicine_update(medicine_id: str, data: MedicineInput, db: Session = DB, user: User = USER):
    require_permission(db, user, 'manage_pharmacy')
    item = db.get(Medicine, medicine_id)
    if not item:
        raise HTTPException(404, 'Medicine unavailable.')
    for field, value in data.model_dump().items():
        setattr(item, field, value)
    audit(db, user, 'medicine.update', item.id)
    db.commit()
    return public_row(item)


def list_bills(db, user):
    stmt = select(Bill)
    if user.role == 'patient':
        stmt = stmt.where(Bill.patient_id.in_(permitted_patient_ids(db, user)))
    else:
        require_permission(db, user, 'billing')
    result = []
    for bill in db.scalars(stmt.order_by(Bill.created_at.desc())):
        payments = [public_row(p) for p in db.scalars(select(Payment).where(Payment.bill_id == bill.id))]
        result.append({**public_row(bill), 'payments': payments})
        audit(db, user, 'bill.read', bill.id)
    return result


@router.get('/bills')
def bills(db: Session = DB, user: User = USER):
    result = list_bills(db, user)
    db.commit()
    return result


@router.post('/bills')
def bill_create(data: BillInput, db: Session = DB, user: User = USER):
    require_permission(db, user, 'billing')
    require_patient(db, user, data.patient_id, clinical=False)
    items = [i.model_dump() for i in data.items]
    item = Bill(patient_id=data.patient_id, items=items, total_paise=sum(i['amount_paise'] for i in items))
    db.add(item)
    db.flush()
    audit(db, user, 'bill.create', item.id)
    db.commit()
    return public_row(item)


@router.post('/bills/{bill_id}/payments')
def payment_record(bill_id: str, data: PaymentInput, db: Session = DB, user: User = USER):
    require_permission(db, user, 'billing')
    bill = db.scalar(select(Bill).where(Bill.id == bill_id).with_for_update())
    if not bill:
        raise HTTPException(404, 'Bill unavailable.')
    paid = db.scalar(select(func.coalesce(func.sum(Payment.amount_paise), 0)).where(Payment.bill_id == bill_id))
    if paid + data.amount_paise > bill.total_paise:
        raise HTTPException(409, 'Payment exceeds the remaining bill amount.')
    item = Payment(bill_id=bill_id, **data.model_dump())
    db.add(item)
    db.flush()
    bill.status = 'paid' if paid + data.amount_paise == bill.total_paise else 'partial'
    audit(db, user, 'payment.record', item.id)
    db.commit()
    return public_row(item)


@router.get('/notifications')
def notifications(db: Session = DB, user: User = USER):
    return [public_row(row) for row in db.scalars(select(Notification).where(Notification.user_id == user.id).order_by(Notification.created_at.desc()))]


@router.post('/notifications/read')
def mark_read(db: Session = DB, user: User = USER):
    for item in db.scalars(select(Notification).where(Notification.user_id == user.id)):
        item.read = True
    db.commit()
    return {'ok': True}


@router.post('/notifications/broadcast')
def broadcast(data: BroadcastInput, db: Session = DB, user: User = USER):
    require_permission(db, user, 'manage_notifications')
    stmt = select(User).where(User.active.is_(True))
    if data.audience != 'all':
        stmt = stmt.where(User.role == data.audience)
    accounts = db.scalars(stmt).all()
    for account in accounts:
        notify(db, account.id, data.title, data.message)
    audit(db, user, 'notification.broadcast', data.audience)
    db.commit()
    return {'recipients': len(accounts)}


@router.get('/audit-logs')
def logs(db: Session = DB, user: User = USER, limit: int = 100):
    require_permission(db, user, 'audit')
    return [public_row(row) for row in db.scalars(select(AuditLog).order_by(AuditLog.created_at.desc()).limit(max(1, min(limit, 500))))]


@router.get('/agent-runs')
def runs(db: Session = DB, user: User = USER):
    require_permission(db, user, 'monitor')
    return [public_row(row) for row in db.scalars(select(AgentRun).order_by(AgentRun.created_at.desc()).limit(100))]


@router.get('/conversations')
def conversations(db: Session = DB, user: User = USER):
    return [public_row(row) for row in db.scalars(select(Conversation).where(Conversation.user_id == user.id).order_by(Conversation.created_at.desc()))]


def require_conversation(db, user, conversation_id):
    item = db.get(Conversation, conversation_id)
    if not item or item.user_id != user.id:
        deny(db, user)
    return item


@router.get('/conversations/{conversation_id}/messages')
def messages(conversation_id: str, db: Session = DB, user: User = USER):
    require_conversation(db, user, conversation_id)
    from app.services.history import message_rows
    return message_rows(db, user, db.scalars(select(Message).where(Message.conversation_id == conversation_id).order_by(Message.created_at)))


@router.get('/monitor/conversations')
def monitor_conversations(db: Session = DB, user: User = USER):
    require_permission(db, user, 'monitor')
    return [public_row(row) for row in db.scalars(select(Conversation).limit(100))]


@router.get('/monitor/conversations/{conversation_id}/messages')
def monitor_messages(conversation_id: str, db: Session = DB, user: User = USER):
    require_permission(db, user, 'monitor_sensitive')
    # Clinical content requires an additional permission beyond operational monitoring.
    require_permission(db, user, 'clinical_records')
    audit(db, user, 'conversation.monitor', conversation_id)
    result = [public_row(row) for row in db.scalars(select(Message).where(Message.conversation_id == conversation_id).order_by(Message.created_at))]
    db.commit()
    return result


@router.post('/chat')
def chat(data: ChatInput, db: Session = DB, user: User = USER):
    from app.agents.orchestrator import run_chat
    if data.patient_id:
        require_patient(db, user, data.patient_id)
    if data.conversation_id:
        conversation = require_conversation(db, user, data.conversation_id)
    else:
        conversation = Conversation(user_id=user.id)
        db.add(conversation)
        db.flush()
    db.add(Message(conversation_id=conversation.id, role='user', content=data.message))
    result = run_chat(db, user, conversation, data.message, data.patient_id)
    db.add(Message(conversation_id=conversation.id, role='assistant', content=result['answer'], details={
        'scope': result['scope'], 'citations': result['citations'], 'action_ids': [a['id'] for a in result['actions']]}))
    db.commit()
    return {'conversation_id': conversation.id, **result}


@router.post('/actions/propose')
def action_propose(data: ActionProposal, db: Session = DB, user: User = USER):
    require_conversation(db, user, data.conversation_id)
    pending = propose(db, user, data.conversation_id, data.kind, data.arguments)
    db.commit()
    return public_row(pending)


@router.post('/actions/{action_id}/confirm')
def action_confirm(action_id: str, db: Session = DB, user: User = USER):
    result = confirm(db, user, action_id)
    db.commit()
    return result


@router.post('/actions/{action_id}/dismiss')
def action_dismiss(action_id: str, db: Session = DB, user: User = USER):
    pending = db.scalar(select(PendingAction).where(PendingAction.id == action_id, PendingAction.user_id == user.id).with_for_update())
    if not pending:
        deny(db, user)
    if pending.status == 'pending':
        pending.status = 'dismissed'
    audit(db, user, 'action.dismiss', action_id)
    db.commit()
    return {'ok': True}
