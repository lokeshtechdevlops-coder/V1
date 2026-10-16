from pathlib import Path
import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, text
from sqlalchemy.exc import IntegrityError
from app.core.config import get_settings


def test_existing_accounts_receive_unique_permanent_ids(tmp_path, monkeypatch):
    url = f'sqlite:///{tmp_path / "migration.db"}'
    monkeypatch.setattr(get_settings(), 'database_url', url)
    config = Config(str(Path(__file__).resolve().parents[1] / 'alembic.ini'))
    command.upgrade(config, '0007')
    engine = create_engine(url)
    with engine.begin() as connection:
        for index, role in enumerate(['patient', 'patient', 'doctor', 'admin']):
            connection.execute(text('''INSERT INTO users
                (id, email, password_hash, name, role, permissions, phone, active)
                VALUES (:id, :email, 'hash', 'Existing account', :role, '[]', '', 1)'''),
                {'id': str(index), 'email': f'{index}@example.com', 'role': role})
    command.upgrade(config, '0008')
    with engine.begin() as connection:
        connection.execute(text('UPDATE users SET account_id = :value WHERE id = :id'),
                           {'id': '0', 'value': 'pat-12345678' + 'a' * 24})
        connection.execute(text('UPDATE users SET account_id = :value WHERE id = :id'),
                           {'id': '1', 'value': 'pat-12345678'})
    command.upgrade(config, 'head')
    with engine.connect() as connection:
        rows = connection.execute(text('SELECT id, role, account_id FROM users ORDER BY id')).all()
    ids = [row.account_id for row in rows]
    assert len(set(ids)) == 4
    assert all(len(value) == 12 for value in ids)
    assert [value[:4] for value in ids] == ['pat-', 'pat-', 'doc-', 'adm-']
    assert [row.id for row in rows] == ['0', '1', '2', '3']
    assert ids[1] == 'pat-12345678'
    with pytest.raises(IntegrityError), engine.begin() as connection:
        connection.execute(text('UPDATE users SET account_id = :value'), {'value': ids[0]})
    command.upgrade(config, 'head')
    with engine.connect() as connection:
        assert connection.execute(text('SELECT account_id FROM users ORDER BY id')).scalars().all() == ids
    engine.dispose()


def test_short_id_generation_retries_existing_suffix(db_factory, monkeypatch):
    from types import SimpleNamespace
    from app.models import User
    from app.models import entities
    with db_factory() as db:
        db.add(User(id='collision-existing', account_id='pat-12345678', role='patient',
                    email='existing-id@example.com', name='Existing', password_hash='hash'))
        db.commit()
        suffixes = iter(['12345678', 'abcdef01'])
        monkeypatch.setattr(entities, 'uuid4', lambda: SimpleNamespace(hex=next(suffixes)))
        account = User(id='collision-new', role='patient', email='new-id@example.com',
                       name='New', password_hash='hash')
        db.add(account)
        db.commit()
        assert account.account_id == 'pat-abcdef01'
