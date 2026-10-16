# Protected local storage

Files are stored with generated names and served only through authenticated API
downloads. This directory must never be exposed by the frontend or a static file server.
PostgreSQL stores metadata and document access rules. Back up the database and
this directory together. `demo.db` is an explicit SQLite demonstration database,
not the configured PostgreSQL database. Runtime files are ignored by Git.
