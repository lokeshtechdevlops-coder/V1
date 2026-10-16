from fastapi import HTTPException
from sqlalchemy import and_, or_, select, false
from app.models import AuditLog, CareGrant, Doctor, Patient, now


def audit(db, user, action, resource, outcome='allowed'):
    db.add(AuditLog(actor_id=user.id, action=action, resource=str(resource), outcome=outcome))


def deny(db, user, resource='restricted'):
    # Called before mutations; record denials even when the request rolls back.
    audit(db, user, 'access.denied', resource, 'denied')
    db.commit()
    raise HTTPException(403, 'Access to this resource is not permitted.')


def require_permission(db, user, permission):
    if permission not in user.permissions:
        deny(db, user, permission)


def doctor_for(db, user):
    return db.scalar(select(Doctor).where(Doctor.user_id == user.id)) if user.role == 'doctor' else None


def own_patient(db, user):
    return db.scalar(select(Patient).where(Patient.user_id == user.id)) if user.role == 'patient' else None


def patient_scope(db, user, clinical=True):
    if user.role == 'patient':
        return Patient.user_id == user.id
    if user.role == 'doctor':
        doctor = doctor_for(db, user)
        if not doctor:
            return false()
        grants = select(CareGrant.patient_id).where(
            CareGrant.doctor_id == doctor.id, CareGrant.active.is_(True),
            or_(CareGrant.expires_at.is_(None), CareGrant.expires_at > now()))
        return Patient.id.in_(grants)
    permission = 'clinical_records' if clinical else 'manage_patients'
    return Patient.id.is_not(None) if permission in user.permissions else false()


def permitted_patient_ids(db, user, clinical=True):
    return select(Patient.id).where(patient_scope(db, user, clinical))


def require_patient(db, user, patient_id, clinical=True):
    if user.role == 'doctor':
        doctor = doctor_for(db, user)
        grant = db.scalar(select(CareGrant).where(
            CareGrant.doctor_id == doctor.id, CareGrant.patient_id == patient_id,
            CareGrant.active.is_(True),
            or_(CareGrant.expires_at.is_(None), CareGrant.expires_at > now())).with_for_update()) if doctor else None
        if not grant:
            deny(db, user)
    patient = db.scalar(select(Patient).where(Patient.id == patient_id, patient_scope(db, user, clinical)))
    if not patient:
        deny(db, user)
    return patient


def document_scope(db, user):
    from app.models import Document
    audiences = ['public']
    if user.role == 'doctor':
        audiences.append('doctor')
    if 'clinical_records' in user.permissions:
        audiences.append('doctor')
    if 'restricted_documents' in user.permissions:
        audiences.append('admin')
    return or_(and_(Document.patient_id.is_(None), Document.audience.in_(audiences)),
               and_(Document.audience == 'private', Document.patient_id.in_(permitted_patient_ids(db, user))))


def require_document(db, user, doc_id):
    from app.models import Document
    doc = db.scalar(select(Document).where(Document.id == doc_id, Document.active.is_(True), document_scope(db, user)))
    if not doc:
        deny(db, user)
    return doc
