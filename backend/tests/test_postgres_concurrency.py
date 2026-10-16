"""Optional integration test. TEST_POSTGRES_URL must point at a dedicated test database."""
import os
from concurrent.futures import ThreadPoolExecutor
from uuid import uuid4
import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine, text, select
from sqlalchemy.orm import sessionmaker
from app.core.database import Base
from app.core.security import passwords
from app.models import User, Patient, Department, Doctor, Slot, Appointment, now
from app.schemas.requests import AppointmentInput
from app.services.hospital import book
from datetime import timedelta


@pytest.mark.postgres
def test_concurrent_booking_commits_only_once():
    url = os.environ.get('TEST_POSTGRES_URL')
    if not url:
        pytest.skip('Set TEST_POSTGRES_URL for PostgreSQL concurrency verification.')
    schema = 'test_' + uuid4().hex
    control = create_engine(url)
    with control.begin() as conn:
        conn.execute(text(f'CREATE SCHEMA {schema}'))
    engine = create_engine(url, connect_args={'options': f'-csearch_path={schema},public'})
    factory = sessionmaker(bind=engine, expire_on_commit=False)
    try:
        Base.metadata.create_all(engine, checkfirst=False)
        with factory() as db:
            db.add_all([User(id=f'u{i}',name=f'Patient {i}',email=f'p{i}@test.local',role='patient',password_hash=passwords.hash('testpassword')) for i in range(2)])
            db.add(User(id='du',name='Doctor',email='d@test.local',role='doctor',password_hash=passwords.hash('testpassword')))
            db.add(Department(id='dep',name='Test'))
            db.flush()
            db.add_all([Patient(id=f'p{i}',user_id=f'u{i}',mrn=f'TEST{i}') for i in range(2)])
            db.add(Doctor(id='doc',user_id='du',department_id='dep',specialisation='Test'))
            db.flush()
            db.add(Slot(id='slot',doctor_id='doc',starts_at=now()+timedelta(days=1)))
            db.commit()
        def attempt(i):
            with factory() as db:
                try:
                    book(db,db.get(User,f'u{i}'),AppointmentInput(slot_id='slot'))
                    db.commit()
                    return 200
                except HTTPException as exc:
                    db.rollback()
                    return exc.status_code
        with ThreadPoolExecutor(max_workers=2) as pool:
            results=list(pool.map(attempt,[0,1]))
        assert sorted(results)==[200,409]
        with factory() as db:
            assert len(db.scalars(select(Appointment)).all())==1
    finally:
        engine.dispose()
        with control.begin() as conn:
            conn.execute(text(f'DROP SCHEMA {schema} CASCADE'))
        control.dispose()
