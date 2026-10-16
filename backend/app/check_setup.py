"""Check initialization dependencies without exposing connection credentials."""
from pydantic import ValidationError
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
from app.core.config import get_settings


def main():
    try:
        settings = get_settings()
    except ValidationError as error:
        for item in error.errors(include_input=False, include_url=False):
            print(f"Configuration error: {item['msg']}")
        return 1
    engine = create_engine(settings.database_url)
    try:
        with engine.connect() as connection:
            connection.execute(text('SELECT 1'))
            if engine.dialect.name == 'postgresql':
                available = connection.scalar(text("SELECT EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'vector')"))
                if not available:
                    print('Install the pgvector PostgreSQL extension first. See V1/backend/PGVECTOR_SETUP.md.')
                    return 1
            elif settings.ai_mode == 'nim':
                print('Semantic RAG requires PostgreSQL with pgvector. Use AI_MODE=demo for SQLite.')
                return 1
        print(f'Setup check passed: {engine.dialect.name}, AI_MODE={settings.ai_mode}')
        return 0
    except SQLAlchemyError:
        print('Database connection failed. Check DATABASE_URL and the PostgreSQL service.')
        return 1
    finally:
        engine.dispose()


if __name__ == '__main__':
    raise SystemExit(main())
