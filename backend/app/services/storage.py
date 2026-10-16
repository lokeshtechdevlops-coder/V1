import hashlib
from pathlib import Path
from uuid import uuid4
from fastapi import HTTPException
from app.core.config import get_settings
from app.models import Document
from .access import audit, deny, require_patient, require_permission

TYPES = {'.pdf': 'application/pdf', '.txt': 'text/plain', '.md': 'text/markdown',
         '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg'}


def store(db, user, upload, title, category, audience, patient_id=None, version='1'):
    settings = get_settings()
    if not title.strip() or len(title) > 200 or len(version) > 30:
        raise HTTPException(422, 'Provide a valid title and version.')
    if audience == 'private':
        if user.role == 'patient' or not patient_id:
            deny(db, user)
        require_patient(db, user, patient_id)
    else:
        require_permission(db, user, 'manage_documents')
        if audience not in {'public', 'doctor', 'admin'} or patient_id:
            raise HTTPException(422, 'Invalid document audience.')
    filename = Path(upload.filename or '').name
    suffix = Path(filename).suffix.lower()
    if suffix not in TYPES:
        raise HTTPException(422, 'Supported files: PDF, TXT, MD, PNG, JPG.')
    content = upload.file.read(settings.upload_limit_bytes + 1)
    if not content or len(content) > settings.upload_limit_bytes:
        raise HTTPException(413, 'File must be between 1 byte and 10 MB.')
    if suffix == '.pdf' and not content.startswith(b'%PDF-'):
        raise HTTPException(422, 'Invalid PDF file.')
    if suffix == '.png' and not content.startswith(b'\x89PNG\r\n\x1a\n'):
        raise HTTPException(422, 'Invalid PNG file.')
    if suffix in {'.jpg', '.jpeg'} and not content.startswith(b'\xff\xd8\xff'):
        raise HTTPException(422, 'Invalid JPEG file.')
    if suffix in {'.txt', '.md'}:
        try:
            content.decode('utf-8')
        except UnicodeDecodeError:
            raise HTTPException(422, 'Text documents must use UTF-8.')
    stored_name = f'{uuid4()}{suffix}'
    settings.storage_path.mkdir(parents=True, exist_ok=True)
    path = settings.storage_path / stored_name
    path.write_bytes(content)
    doc = Document(title=title.strip(), category=category[:50], audience=audience,
                   patient_id=patient_id, uploaded_by=user.id, filename=filename[:255],
                   stored_name=stored_name, mime=TYPES[suffix], size=len(content),
                   sha256=hashlib.sha256(content).hexdigest(), version=version)
    try:
        db.add(doc)
        db.flush()
    except Exception:
        path.unlink(missing_ok=True)
        raise
    audit(db, user, 'document.upload', doc.id)
    return doc


def document_path(doc):
    root = get_settings().storage_path
    path = (root / doc.stored_name).resolve()
    if path.parent != root or not path.is_file():
        raise HTTPException(404, 'File is unavailable.')
    return path
