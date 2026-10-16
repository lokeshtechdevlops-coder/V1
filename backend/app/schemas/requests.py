from datetime import datetime, timezone, date
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator


class Input(BaseModel):
    model_config = ConfigDict(extra='forbid')


class Login(Input):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=1, max_length=256)


class PatientSignup(Input):
    role: Literal['patient', 'doctor', 'admin'] = 'patient'
    name: str = Field(min_length=1, max_length=150)
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=12, max_length=128)
    confirm_password: str = Field(min_length=12, max_length=128)
    phone: str = Field(default='', max_length=30)
    dob: date | None = None
    gender: Literal['Male', 'Female', 'Other', 'Prefer not to say', ''] = ''

    @field_validator('name')
    @classmethod
    def nonempty_name(cls, value):
        value = value.strip()
        if not value:
            raise ValueError('Enter your full name.')
        return value

    @field_validator('email')
    @classmethod
    def valid_email(cls, value):
        import re
        value = value.strip().lower()
        if not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', value):
            raise ValueError('Enter a valid email address.')
        return value

    @field_validator('confirm_password')
    @classmethod
    def matching_password(cls, value, info):
        if value != info.data.get('password'):
            raise ValueError('Passwords must match.')
        return value

    @field_validator('dob')
    @classmethod
    def valid_birth_date(cls, value):
        from zoneinfo import ZoneInfo
        today = datetime.now(ZoneInfo('Asia/Kolkata')).date()
        if value and value > today:
            raise ValueError('Date of birth cannot be in the future.')
        return value


class ProfileUpdate(Input):
    name: str = Field(min_length=1, max_length=150)
    phone: str = Field(default='', max_length=30)


class DepartmentInput(Input):
    name: str = Field(min_length=1, max_length=100)
    description: str = Field(default='', max_length=2000)


class RegisterUser(Input):
    name: str = Field(min_length=1, max_length=150)
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=12, max_length=128)
    role: Literal['patient', 'doctor']
    mrn: str | None = Field(default=None, max_length=40)
    dob: str = Field(default='', max_length=10)
    gender: str = Field(default='', max_length=30)
    department_id: str | None = None
    specialisation: str = Field(default='', max_length=100)


class UserStatus(Input):
    active: bool


class SignupReview(Input):
    approve: bool
    department_id: str | None = None
    specialisation: str = Field(default='', max_length=100)


class DoctorUpdate(Input):
    specialisation: str = Field(min_length=1, max_length=100)
    bio: str = Field(default='', max_length=2000)


class GrantInput(Input):
    doctor_id: str
    patient_id: str
    kind: Literal['assigned', 'consult'] = 'assigned'
    expires_at: datetime | None = None

    @field_validator('expires_at')
    @classmethod
    def utc_expiry(cls, value):
        if value is not None:
            if value.tzinfo is None:
                raise ValueError('Use a timezone-aware expiry timestamp.')
            return value.astimezone(timezone.utc)
        return value


class SlotInput(Input):
    doctor_id: str
    starts_at: datetime
    duration_minutes: int = Field(default=30, ge=15, le=120)

    @field_validator('starts_at')
    @classmethod
    def utc_start(cls, value):
        if value.tzinfo is None:
            raise ValueError('Use a timezone-aware slot timestamp.')
        return value.astimezone(timezone.utc)


class AppointmentInput(Input):
    slot_id: str
    patient_id: str | None = None
    reason: str = Field(default='', max_length=1000)


class RescheduleInput(Input):
    slot_id: str


class PrescriptionInput(Input):
    patient_id: str
    medicine: str = Field(min_length=1, max_length=200)
    dosage: str = Field(min_length=1, max_length=100)
    frequency: str = Field(min_length=1, max_length=100)
    duration: str = Field(min_length=1, max_length=100)
    instructions: str = Field(default='', max_length=2000)


class MedicalRecordInput(Input):
    patient_id: str
    diagnosis: str = Field(min_length=1, max_length=300)
    notes: str = Field(min_length=1, max_length=10000)


class PatientUpdate(Input):
    name: str = Field(min_length=1, max_length=150)
    phone: str = Field(default='', max_length=30)
    dob: str = Field(default='', max_length=10)
    gender: str = Field(default='', max_length=30)


class MedicineInput(Input):
    name: str = Field(min_length=1, max_length=200)
    description: str = Field(default='', max_length=2000)
    stock: int = Field(ge=0)
    low_stock_threshold: int = Field(default=20, ge=0)


class BillItem(Input):
    description: str = Field(min_length=1, max_length=200)
    amount_paise: int = Field(gt=0)


class BillInput(Input):
    patient_id: str
    items: list[BillItem] = Field(min_length=1, max_length=100)


class PaymentInput(Input):
    amount_paise: int = Field(gt=0)
    reference: str = Field(min_length=3, max_length=100)


class BroadcastInput(Input):
    audience: Literal['patient', 'doctor', 'all']
    title: str = Field(min_length=1, max_length=200)
    message: str = Field(min_length=1, max_length=2000)


class ActiveInput(Input):
    active: bool


class ChatInput(Input):
    message: str = Field(min_length=1, max_length=4000)
    conversation_id: str | None = None
    patient_id: str | None = None


class ActionProposal(Input):
    conversation_id: str
    kind: Literal['book', 'cancel', 'reschedule', 'prescribe']
    arguments: dict
