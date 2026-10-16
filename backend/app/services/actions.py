from datetime import timedelta
from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy import select
from app.core.security import aware
from app.models import PendingAction, now
from app.schemas.requests import AppointmentInput, PrescriptionInput, Input
from .access import audit, deny, doctor_for, require_patient
from .hospital import appointment_access, book, cancel, reschedule, resolve_booking_patient, prescribe


class CancelArguments(Input):
    appointment_id: str


class RescheduleArguments(CancelArguments):
    slot_id: str


ARGUMENTS = {'book': AppointmentInput, 'cancel': CancelArguments,
             'reschedule': RescheduleArguments, 'prescribe': PrescriptionInput}


def decision(db, user, kind, arguments):
    try:
        args = ARGUMENTS[kind].model_validate(arguments)
    except (KeyError, ValidationError):
        raise HTTPException(422, 'Invalid action arguments.')
    if kind == 'book':
        resolve_booking_patient(db, user, args.patient_id)
    elif kind in {'cancel', 'reschedule'}:
        appointment_access(db, user, args.appointment_id)
    else:
        if not doctor_for(db, user):
            deny(db, user)
        require_patient(db, user, args.patient_id)
    return args


def propose(db, user, conversation_id, kind, arguments):
    args = decision(db, user, kind, arguments)
    # Resolve implicit identity now; never let the model select the acting user.
    if kind == 'book':
        args.patient_id = resolve_booking_patient(db, user, args.patient_id).id
    pending = PendingAction(user_id=user.id, conversation_id=conversation_id, kind=kind,
                            arguments=args.model_dump(), expires_at=now() + timedelta(minutes=10))
    db.add(pending)
    db.flush()
    audit(db, user, 'action.propose', pending.id)
    return pending


def confirm(db, user, action_id):
    pending = db.scalar(select(PendingAction).where(PendingAction.id == action_id,
                                                   PendingAction.user_id == user.id).with_for_update())
    if not pending:
        deny(db, user)
    # Recheck access even for repeated confirmations after a grant was revoked.
    args = decision(db, user, pending.kind, pending.arguments)
    if pending.status == 'executed':
        return pending.result
    if pending.status != 'pending' or aware(pending.expires_at) <= now():
        raise HTTPException(409, 'This action has expired or was dismissed. Request a new proposal.')
    if pending.kind == 'book':
        record = book(db, user, args)
    elif pending.kind == 'cancel':
        record = cancel(db, user, args.appointment_id)
    elif pending.kind == 'reschedule':
        record = reschedule(db, user, args.appointment_id, args.slot_id)
    else:
        record = prescribe(db, user, args)
    pending.status = 'executed'
    pending.result = {'id': record.id, 'kind': pending.kind, 'status': 'executed'}
    audit(db, user, 'action.confirm', pending.id)
    db.flush()
    return pending.result
