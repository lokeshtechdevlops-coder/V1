"""Revalidate historical evidence when access grants or document audiences change."""
from sqlalchemy import select
from app.models import Appointment, Bill, Document, PendingAction, Slot
from .access import permitted_patient_ids, document_scope, doctor_for
from .serialization import public_row


def message_rows(db, user, messages):
    clinical = set(db.scalars(permitted_patient_ids(db, user)))
    demographics = set(db.scalars(permitted_patient_ids(db, user, clinical=False)))
    documents = set(db.scalars(select(Document.id).where(Document.active.is_(True), document_scope(db, user))))
    appointments = select(Appointment.id)
    if user.role == 'admin':
        appointment_ids = set(db.scalars(appointments)) if 'manage_appointments' in user.permissions else set()
    elif user.role == 'doctor':
        doctor = doctor_for(db, user)
        appointment_ids = set(db.scalars(appointments.join(Slot, Slot.id == Appointment.slot_id).where(
            Slot.doctor_id == doctor.id, Appointment.patient_id.in_(clinical)))) if doctor else set()
    else:
        appointment_ids = set(db.scalars(appointments.where(Appointment.patient_id.in_(clinical))))
    bill_ids = set(db.scalars(select(Bill.id))) if 'billing' in user.permissions else (
        set(db.scalars(select(Bill.id).where(Bill.patient_id.in_(clinical)))) if user.role == 'patient' else set())
    allowed = {'patient_ids': clinical, 'demographic_ids': demographics, 'document_ids': documents,
               'appointment_ids': appointment_ids, 'bill_ids': bill_ids}
    rows = []
    for message in messages:
        row = public_row(message, {'details'})
        row['citations'], row['actions'] = [], []
        if message.role == 'assistant':
            details = message.details or {}
            scope = details.get('scope')
            if scope is None or any(not set(scope.get(key, [])).issubset(ids) for key, ids in allowed.items()):
                row['content'] = 'This historical response is no longer available under your current access. Ask again to retrieve permitted information.'
                row['redacted'] = True
            else:
                row['citations'] = details.get('citations', [])
                for action_id in details.get('action_ids', []):
                    pending = db.get(PendingAction, action_id)
                    if pending and pending.user_id == user.id:
                        row['actions'].append(public_row(pending))
        rows.append(row)
    return rows
