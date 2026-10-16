from sqlalchemy import inspect
from datetime import datetime, timezone


def public_row(row, exclude=()):
    result = {}
    for column in inspect(type(row)).columns:
        if column.key in exclude:
            continue
        value = getattr(row, column.key)
        if isinstance(value, datetime):
            # SQLite strips timezone metadata; all stored timestamps follow the UTC contract.
            value = value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)
        result[column.key] = value
    return result


def user_row(user):
    return public_row(user, {'password_hash'})


def document_row(doc):
    return public_row(doc, {'stored_name', 'processing_error'})
