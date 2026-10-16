"""Manual diagnostic. Importing this module never opens a database connection."""


def main():
    from sqlalchemy import text
    from app.core.database import SessionLocal
    try:
        with SessionLocal() as db:
            assert db.scalar(text('SELECT 1')) == 1
        print('Database connection passed.')
        return 0
    except Exception as error:
        print(f'Database connection failed: {type(error).__name__}. Check backend configuration.')
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
