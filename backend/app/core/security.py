import secrets
from datetime import timedelta
import jwt
from pwdlib import PasswordHash
from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.core.config import get_settings
from app.core.database import get_db
from app.models import AuthSession, User, now

passwords = PasswordHash.recommended()
DUMMY_HASH = passwords.hash('not-a-real-password')


def aware(value):
    from datetime import timezone
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


def issue_session(db, user):
    settings = get_settings()
    session = AuthSession(user_id=user.id, csrf_token=secrets.token_urlsafe(32),
                          expires_at=now() + timedelta(minutes=settings.session_minutes))
    db.add(session)
    db.flush()
    token = jwt.encode({'sub': user.id, 'sid': session.id, 'exp': session.expires_at},
                       settings.jwt_secret, algorithm='HS256')
    return session, token


def current_user(request: Request, db: Session = Depends(get_db)):
    try:
        claims = jwt.decode(request.cookies.get('hospital_session', ''), get_settings().jwt_secret,
                            algorithms=['HS256'], options={'require': ['sub', 'sid', 'exp']})
        session = db.get(AuthSession, claims['sid'])
        user = db.get(User, claims['sub'])
        if not session or session.revoked or session.user_id != claims['sub'] or aware(session.expires_at) <= now() or not user or not user.active:
            raise ValueError('Invalid session')
    except (jwt.PyJWTError, ValueError, KeyError):
        raise HTTPException(401, 'Sign in to continue.')
    if request.method not in {'GET', 'HEAD', 'OPTIONS'}:
        if request.headers.get('origin') not in {None, get_settings().frontend_origin}:
            raise HTTPException(403, 'Request origin is not allowed.')
        if not secrets.compare_digest(request.headers.get('x-csrf-token', ''), session.csrf_token):
            raise HTTPException(403, 'Invalid request token.')
    request.state.auth_session = session
    return user
