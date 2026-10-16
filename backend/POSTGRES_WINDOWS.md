# PostgreSQL + pgvector on Windows

Install the pgvector extension for your PostgreSQL server version, then follow
[PGVECTOR_SETUP.md](PGVECTOR_SETUP.md). Installing the Python `pgvector` package
alone does not install the PostgreSQL server extension.

Options:

- Use `V1/compose.yaml` with Docker Desktop switched to Linux containers.
- Use a hosted PostgreSQL database that supports pgvector.
- Build the native Windows extension using Visual Studio C++ tools and the
  instructions in the [official pgvector Windows guide](https://github.com/pgvector/pgvector#windows).
  Set `PGROOT` to your installed PostgreSQL directory and build for that version.

Verify extension availability in PostgreSQL:

```sql
SELECT name, default_version FROM pg_available_extensions WHERE name = 'vector';
CREATE EXTENSION IF NOT EXISTS vector;
```

From the project root, run `.\V1\backend\run.ps1 -Initialize` to migrate.
For an offline demonstration without pgvector, use
`.\V1\backend\run.ps1 -Demo -Initialize`; this uses SQLite and keyword search.
