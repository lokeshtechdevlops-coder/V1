from datetime import datetime, timezone
from uuid import uuid4
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, JSON, UniqueConstraint, select
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base
from pgvector.sqlalchemy import VECTOR


def uid():
    return str(uuid4())


def now():
    return datetime.now(timezone.utc)


def account_id_default(context):
    prefix = {'patient': 'pat', 'doctor': 'doc', 'admin': 'adm'}[context.get_current_parameters()['role']]
    for _ in range(20):
        candidate = f'{prefix}-{uuid4().hex[:8]}'
        if context.connection.scalar(select(User.id).where(User.account_id == candidate)) is None:
            return candidate
    raise RuntimeError('Could not allocate a unique account ID. Please retry.')


class User(Base):
    __tablename__ = 'users'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    account_id: Mapped[str] = mapped_column(String(36), unique=True, default=account_id_default)
    email: Mapped[str] = mapped_column(String(254), unique=True)
    password_hash: Mapped[str] = mapped_column(Text)
    name: Mapped[str] = mapped_column(String(150))
    role: Mapped[str] = mapped_column(String(20))
    signup_status: Mapped[str] = mapped_column(String(20), default='approved')
    permissions: Mapped[list] = mapped_column(JSON, default=list)
    phone: Mapped[str] = mapped_column(String(30), default='')
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class AuthSession(Base):
    __tablename__ = 'auth_sessions'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(ForeignKey('users.id'), index=True)
    csrf_token: Mapped[str] = mapped_column(String(128))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked: Mapped[bool] = mapped_column(Boolean, default=False)


class Department(Base):
    __tablename__ = 'departments'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    name: Mapped[str] = mapped_column(String(100), unique=True)
    description: Mapped[str] = mapped_column(Text, default='')


class Patient(Base):
    __tablename__ = 'patients'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(ForeignKey('users.id'), unique=True)
    mrn: Mapped[str] = mapped_column(String(40), unique=True)
    dob: Mapped[str] = mapped_column(String(10), default='')
    gender: Mapped[str] = mapped_column(String(30), default='')


class Doctor(Base):
    __tablename__ = 'doctors'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(ForeignKey('users.id'), unique=True)
    department_id: Mapped[str] = mapped_column(ForeignKey('departments.id'))
    specialisation: Mapped[str] = mapped_column(String(100))
    bio: Mapped[str] = mapped_column(Text, default='')


class CareGrant(Base):
    __tablename__ = 'care_grants'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    doctor_id: Mapped[str] = mapped_column(ForeignKey('doctors.id'), index=True)
    patient_id: Mapped[str] = mapped_column(ForeignKey('patients.id'), index=True)
    kind: Mapped[str] = mapped_column(String(30), default='assigned')
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class Slot(Base):
    __tablename__ = 'slots'
    __table_args__ = (UniqueConstraint('doctor_id', 'starts_at'),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    doctor_id: Mapped[str] = mapped_column(ForeignKey('doctors.id'), index=True)
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    duration_minutes: Mapped[int] = mapped_column(Integer, default=30)
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class Appointment(Base):
    __tablename__ = 'appointments'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    patient_id: Mapped[str] = mapped_column(ForeignKey('patients.id'), index=True)
    slot_id: Mapped[str] = mapped_column(ForeignKey('slots.id'))
    # Cancelled bookings retain history but release the unique reservation.
    reservation_slot_id: Mapped[str | None] = mapped_column(ForeignKey('slots.id'), unique=True, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default='confirmed')
    reason: Mapped[str] = mapped_column(Text, default='')
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Document(Base):
    __tablename__ = 'documents'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    title: Mapped[str] = mapped_column(String(200))
    category: Mapped[str] = mapped_column(String(50), default='report')
    audience: Mapped[str] = mapped_column(String(20), default='private')
    patient_id: Mapped[str | None] = mapped_column(ForeignKey('patients.id'), nullable=True, index=True)
    uploaded_by: Mapped[str] = mapped_column(ForeignKey('users.id'))
    filename: Mapped[str] = mapped_column(String(255))
    stored_name: Mapped[str] = mapped_column(String(100), unique=True)
    mime: Mapped[str] = mapped_column(String(100))
    size: Mapped[int] = mapped_column(Integer)
    sha256: Mapped[str] = mapped_column(String(64))
    version: Mapped[str] = mapped_column(String(30), default='1')
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    processing_status: Mapped[str] = mapped_column(String(20), default='uploaded')
    processing_error: Mapped[str] = mapped_column(Text, default='')
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class DocumentChunk(Base):
    __tablename__ = 'document_chunks'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    document_id: Mapped[str] = mapped_column(ForeignKey('documents.id', ondelete='CASCADE'), index=True)
    position: Mapped[int] = mapped_column(Integer)
    content: Mapped[str] = mapped_column(Text)
    # SQLite is reserved for the explicit keyword-search demo and unit tests.
    embedding: Mapped[list | None] = mapped_column(
        VECTOR().with_variant(JSON(), 'sqlite'), nullable=True)
    embedding_model: Mapped[str] = mapped_column(String(150), default='')


class Prescription(Base):
    __tablename__ = 'prescriptions'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    patient_id: Mapped[str] = mapped_column(ForeignKey('patients.id'), index=True)
    doctor_id: Mapped[str] = mapped_column(ForeignKey('doctors.id'))
    medicine: Mapped[str] = mapped_column(String(200))
    dosage: Mapped[str] = mapped_column(String(100))
    frequency: Mapped[str] = mapped_column(String(100))
    duration: Mapped[str] = mapped_column(String(100))
    instructions: Mapped[str] = mapped_column(Text, default='')
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class MedicalRecord(Base):
    __tablename__ = 'medical_records'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    patient_id: Mapped[str] = mapped_column(ForeignKey('patients.id'), index=True)
    doctor_id: Mapped[str] = mapped_column(ForeignKey('doctors.id'))
    diagnosis: Mapped[str] = mapped_column(String(300))
    notes: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Medicine(Base):
    __tablename__ = 'medicines'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default='')
    stock: Mapped[int] = mapped_column(Integer, default=0)
    low_stock_threshold: Mapped[int] = mapped_column(Integer, default=20)


class Bill(Base):
    __tablename__ = 'bills'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    patient_id: Mapped[str] = mapped_column(ForeignKey('patients.id'), index=True)
    items: Mapped[list] = mapped_column(JSON)
    total_paise: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(20), default='unpaid')
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Payment(Base):
    __tablename__ = 'payments'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    bill_id: Mapped[str] = mapped_column(ForeignKey('bills.id'), index=True)
    amount_paise: Mapped[int] = mapped_column(Integer)
    reference: Mapped[str] = mapped_column(String(100), unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Notification(Base):
    __tablename__ = 'notifications'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(ForeignKey('users.id'), index=True)
    title: Mapped[str] = mapped_column(String(200))
    message: Mapped[str] = mapped_column(Text)
    read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Conversation(Base):
    __tablename__ = 'conversations'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(ForeignKey('users.id'), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Message(Base):
    __tablename__ = 'messages'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    conversation_id: Mapped[str] = mapped_column(ForeignKey('conversations.id'), index=True)
    role: Mapped[str] = mapped_column(String(20))
    content: Mapped[str] = mapped_column(Text)
    details: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class PendingAction(Base):
    __tablename__ = 'pending_actions'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(ForeignKey('users.id'), index=True)
    conversation_id: Mapped[str] = mapped_column(ForeignKey('conversations.id'))
    kind: Mapped[str] = mapped_column(String(30))
    arguments: Mapped[dict] = mapped_column(JSON)
    status: Mapped[str] = mapped_column(String(20), default='pending')
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    result: Mapped[dict | None] = mapped_column(JSON, nullable=True)


class AgentRun(Base):
    __tablename__ = 'agent_runs'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(ForeignKey('users.id'), index=True)
    conversation_id: Mapped[str] = mapped_column(ForeignKey('conversations.id'))
    agent: Mapped[str] = mapped_column(String(30))
    status: Mapped[str] = mapped_column(String(20))
    tool_names: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class AuditLog(Base):
    __tablename__ = 'audit_logs'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    actor_id: Mapped[str] = mapped_column(ForeignKey('users.id'), index=True)
    action: Mapped[str] = mapped_column(String(100))
    resource: Mapped[str] = mapped_column(String(100))
    outcome: Mapped[str] = mapped_column(String(20))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
