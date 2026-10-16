from datetime import timedelta
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from app.core.security import aware
from app.models import Appointment, Slot, Patient, Doctor, User, Notification, Prescription, now
from app.schemas.requests import AppointmentInput, PrescriptionInput
from .access import audit, deny, doctor_for, own_patient, require_patient, require_permission


def notify(db, user_id, title, message):
    db.add(Notification(user_id=user_id, title=title, message=message))


def appointment_access(db, user, appointment_id):
    appointment = db.get(Appointment, appointment_id)
    if not appointment:
        deny(db, user)
    if user.role == 'admin':
        require_permission(db, user, 'manage_appointments')
    elif user.role == 'doctor':
        doctor = doctor_for(db, user)
        if not doctor or db.get(Slot, appointment.slot_id).doctor_id != doctor.id:
            deny(db, user)
        require_patient(db, user, appointment.patient_id)
    else:
        require_patient(db, user, appointment.patient_id)
    return appointment


def resolve_booking_patient(db, user, supplied):
    if user.role == 'patient':
        patient = own_patient(db, user)
        if not patient or (supplied and supplied != patient.id):
            deny(db, user)
        return patient
    if not supplied:
        raise HTTPException(422, 'Select a patient.')
    if user.role == 'admin':
        require_permission(db, user, 'manage_appointments')
        return require_patient(db, user, supplied, clinical=False)
    return require_patient(db, user, supplied)


def lock_slot(db, slot_id, user):
    slot = db.scalar(select(Slot).where(Slot.id == slot_id).with_for_update())
    if not slot or not slot.active or aware(slot.starts_at) <= now():
        raise HTTPException(409, 'This slot is unavailable.')
    doctor = db.get(Doctor, slot.doctor_id)
    if not doctor or not db.get(User, doctor.user_id).active:
        raise HTTPException(409, 'This slot is unavailable.')
    if user.role == 'doctor' and doctor.user_id != user.id:
        deny(db, user)
    if db.scalar(select(Appointment.id).where(Appointment.reservation_slot_id == slot_id)):
        raise HTTPException(409, 'This slot is already booked.')
    return slot


def book(db, user, data: AppointmentInput):
    patient = resolve_booking_patient(db, user, data.patient_id)
    lock_slot(db, data.slot_id, user)
    apt = Appointment(patient_id=patient.id, slot_id=data.slot_id, reservation_slot_id=data.slot_id, reason=data.reason)
    db.add(apt)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, 'This slot is already booked.')
    notify(db, patient.user_id, 'Appointment confirmed', 'Your appointment has been confirmed.')
    audit(db, user, 'appointment.book', apt.id)
    return apt


def cancel(db, user, appointment_id):
    apt = appointment_access(db, user, appointment_id)
    apt = db.scalar(select(Appointment).where(Appointment.id == apt.id).with_for_update())
    if apt.status == 'cancelled':
        return apt
    if apt.status == 'completed' or aware(db.get(Slot, apt.slot_id).starts_at) <= now():
        raise HTTPException(409, 'Past or completed appointments cannot be cancelled.')
    apt.status = 'cancelled'
    apt.reservation_slot_id = None
    notify(db, db.get(Patient, apt.patient_id).user_id, 'Appointment cancelled', 'Your appointment was cancelled.')
    audit(db, user, 'appointment.cancel', apt.id)
    return apt


def reschedule(db, user, appointment_id, slot_id):
    apt = appointment_access(db, user, appointment_id)
    apt = db.scalar(select(Appointment).where(Appointment.id == apt.id).with_for_update())
    if apt.status != 'confirmed' or aware(db.get(Slot, apt.slot_id).starts_at) <= now():
        raise HTTPException(409, 'Only upcoming confirmed appointments can be rescheduled.')
    if apt.slot_id == slot_id:
        return apt
    lock_slot(db, slot_id, user)
    apt.slot_id = slot_id
    apt.reservation_slot_id = slot_id
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, 'This slot is already booked.')
    notify(db, db.get(Patient, apt.patient_id).user_id, 'Appointment rescheduled', 'Your appointment time was changed.')
    audit(db, user, 'appointment.reschedule', apt.id)
    return apt


def prescribe(db, user, data: PrescriptionInput):
    doctor = doctor_for(db, user)
    if not doctor:
        deny(db, user)
    patient = require_patient(db, user, data.patient_id)
    rx = Prescription(doctor_id=doctor.id, **data.model_dump())
    db.add(rx)
    db.flush()
    notify(db, patient.user_id, 'New prescription', 'A prescription has been added by your doctor.')
    audit(db, user, 'prescription.create', rx.id)
    return rx
