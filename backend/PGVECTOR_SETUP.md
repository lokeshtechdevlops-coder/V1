# PostgreSQL + pgvector setup

PostgreSQL stores hospital records, document text, permissions and embeddings.
Semantic retrieval uses pgvector cosine distance, filtered by document ownership,
active care grants, audience and the configured embedding model in SQL.

## Install and initialize

Use PostgreSQL 13+ with the pgvector extension installed on the database server.
`V1/compose.yaml` and CI use `pgvector/pgvector:pg17`, which includes the extension.
Docker requires a Linux container engine. Native Windows setup is described in
[POSTGRES_WINDOWS.md](POSTGRES_WINDOWS.md).

From the project root:

```powershell
.\.venv\Scripts\python.exe -m pip install -r V1\backend\requirements.lock.txt
docker compose -f V1\compose.yaml up -d --wait
.\V1\backend\run.ps1 -Initialize
```

`run.ps1 -Initialize` checks extension availability, applies migrations and seeds
fictional records. Migration 0006 enables `vector`; the migration account needs
permission to create that extension, or a database administrator must enable it
first with `CREATE EXTENSION IF NOT EXISTS vector;` in the application database.

Configure backend `.env`:

```dotenv
DATABASE_URL=postgresql+psycopg://hospital:hospital_local@localhost:5432/hospital
EMBEDDING_DIMENSIONS=2048
RETRIEVAL_MAX_COSINE_DISTANCE=0.5
AI_MODE=nim
NVIDIA_API_KEY=your-backend-only-key
NVIDIA_EMBEDDING_MODEL=nvidia/nemotron-3-embed-1b
```

Preserve your other authentication and NVIDIA settings. No vector-service key is
required. Migration 0007 uses the native `vector` type so historical embeddings survive
provider dimension changes. Retrieval checks both model and dimensions before
cosine comparison. The current NVIDIA model requires 2048 dimensions. Reprocess
documents after switching models; older embeddings are never treated as current.

## Existing databases

Back up the database before applying migration 0006. Existing compatible JSON
embeddings are retained. Documents that used the former remote vector store and
have no local embeddings are marked `uploaded` for reprocessing. From the admin
Knowledge base, process those documents in NIM mode to generate new embeddings.
Private reports can be reprocessed by an authorised user through the document API.
Stored text, original files, ownership and care grants are preserved.

Historical migrations remain in place so existing revision 0005 databases can
upgrade normally. The former cloud index is no longer used by this application;
its deletion is a separate account operation.

## Retrieval and verification

Chunks, embeddings and indexing status publish in one SQL transaction. Exact
cosine ranking is used initially so restrictive access filters do not reduce
approximate-search recall. Add and benchmark an HNSW index only when the corpus
and measured latency warrant it, with pgvector iterative scans for filtered search.

SQLite remains an explicit `AI_MODE=demo` option with keyword retrieval. Semantic
RAG on SQLite returns a configuration error instead of silently changing search.
NVIDIA embedding and inference calls still require network access.

Run the backend suite from the project root:

```powershell
.\.venv\Scripts\python.exe -m pytest -c V1\backend\pytest.ini V1\backend\tests
```

Set `TEST_POSTGRES_URL` to a dedicated PostgreSQL test database with `vector`
enabled to run actual cosine-search, access-control and migration integration
tests. Tests create and remove isolated schemas. CI runs these tests using the
pgvector PostgreSQL image. NVIDIA calls are mocked in these tests.

References: [pgvector](https://github.com/pgvector/pgvector),
[Python / SQLAlchemy integration](https://github.com/pgvector/pgvector-python).

## Repeatable live verification

From the project root:

```powershell
.\.venv\Scripts\python.exe V1\backend\scripts\verify_project.py --live
```

This creates temporary schemas, applies migrations there, runs the complete
hospital API journey on PostgreSQL, checks vector access filters and concurrent
booking, and calls NVIDIA with fictional records to verify proposals and cited RAG.
It removes the temporary schemas afterwards. The account needs CREATE on the
configured database, not permission to create another database. Logs and JUnit
results are written under `V1/storage/verification/`. Omit `--live` for provider-free
checks. Live calls are opt-in and are skipped in CI.

Hosted models can be retired. NVIDIA returned HTTP 410 for the previous
`nvidia/nv-embedqa-e5-v5` model during verification. The replacement was selected
from NVIDIA's live catalog and tested with the configured account.

Model reference: https://docs.api.nvidia.com/nim/reference/nvidia-nemotron-3-embed-1b-infer
