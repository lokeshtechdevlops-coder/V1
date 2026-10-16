# CareNexus hospital management

React + TypeScript + Vite frontend, FastAPI backend, PostgreSQL + pgvector, LangGraph, NVIDIA NIM
and protected local storage. There is no Celery or Redis. All Python commands
use the project-root `.venv`.

## Application features

- Cookie-based JWT sessions, CSRF protection, Argon2 hashes, logout/session revocation.
- Patient/Doctor/Admin dashboards with ownership checks and care-access grants.
- Registration, doctor directory, departments, availability, appointments and rescheduling/cancellation.
- Signup at `/signup` offers Patient, Doctor and Admin roles. Patients receive isolated accounts with generated MRNs. Doctor/Admin requests stay inactive until an administrator approves them from Accounts; approving a doctor requires a department and specialisation.
- Every account receives a unique `account_id`: `pat-`, `doc-`, or `adm-` followed by eight hexadecimal characters (for example, `pat-a1b2c3d4`). IDs appear in profiles, the sidebar, and account/directory lists; staff see theirs when submitting signup. Migrations `0008` and `0009` assign short IDs to existing accounts while preserving internal IDs and patient MRNs.
- Reports, structured clinical notes, prescriptions, pharmacy inventory, invoices and records of received payments.
- In-app notifications and administrative announcements.
- Document audiences, extraction/indexing, activation/deactivation and retrieval citations.
- Six LangGraph agent domains with restricted tools and a server-side NIM connector.
- Expiring action proposals, confirmations, revalidation and replay protection.
- User-owned conversations, operational agent monitoring and audit logs.

## Install and configure

Requirements: Python 3.12, Node.js 22.14+, PostgreSQL with the pgvector extension.
From the project root in PowerShell:

```powershell
.\.venv\Scripts\python.exe -m pip install -r V1\backend\requirements.lock.txt
```

If `V1/backend/.env` does not exist, copy `.env.example` to `.env`. Preserve any
existing configuration. Set a random `JWT_SECRET` of at least 32 characters:

```powershell
.\.venv\Scripts\python.exe -c "import secrets; print(secrets.token_urlsafe(48))"
```

A unique local secret was generated during implementation. Configure the database
URL, frontend origin and storage path in `backend/.env`.

In a separate frontend terminal:

```powershell
Set-Location V1\frontend
npm install
npm run dev
```

Frontend: http://localhost:3000. API: http://localhost:8000.
API documentation: http://localhost:8000/docs. Readiness: http://localhost:8000/health.

## PostgreSQL

PostgreSQL stores hospital records, document text and RAG embeddings using pgvector.
See [pgvector setup](backend/PGVECTOR_SETUP.md) and [Windows setup](backend/POSTGRES_WINDOWS.md).

Using Docker Compose with a Linux container engine:

```powershell
docker compose -f V1\compose.yaml up -d --wait
```

Without Compose, with Linux containers:

```powershell
docker run -d --name carenexus-postgres -e POSTGRES_USER=hospital -e POSTGRES_PASSWORD=hospital_local -e POSTGRES_DB=hospital -p 127.0.0.1:5432:5432 -v carenexus-postgres-data:/var/lib/postgresql/data pgvector/pgvector:pg17
```

The current Windows-only Docker engine cannot run this Linux image. Alternatively,
configure an existing PostgreSQL installation. These database credentials are
for local development only.

From the project root, initialise migrations and fictional demo data, then serve:

```powershell
.\V1\backend\run.ps1 -Initialize
```

Subsequent starts use `.\V1\backend\run.ps1`. Seed creation is explicit and skips
databases that already contain users. Add new Alembic revisions for schema changes.

## Explicit offline demo

To evaluate the application without PostgreSQL or a NIM key:

```powershell
.\V1\backend\run.ps1 -Demo -Initialize
```

This uses `V1/storage/demo.db` and overrides configuration only for that process.
Chat displays a local-demo label and executes permission-checked structured tools.
Document search uses keyword matching; it does not fabricate embeddings or call an
LLM. NIM vector retrieval uses PostgreSQL + pgvector. SQLite tests do not establish
PostgreSQL concurrency behaviour.

All fictional demo accounts use `DemoHospital!2026`:

| Account | Email | Scope |
| --- | --- | --- |
| Patient | patient@carenexus.local | John Doe only |
| Second patient | patient2@carenexus.local | Priya Rao only |
| Doctor | doctor@carenexus.local | John Doe care grant |
| Second doctor | doctor2@carenexus.local | Priya Rao care grant |
| Admin | admin@carenexus.local | Operational permissions; no clinical-record access |

## NVIDIA NIM

In `backend/.env`, configure `AI_MODE=nim`, `NVIDIA_API_KEY`, `NVIDIA_CHAT_MODEL`,
`NVIDIA_EMBEDDING_MODEL`, `NVIDIA_BASE_URL` and `EMBEDDING_DIMENSIONS` for models
supported by your deployment. Enable pgvector and run migrations; see
[pgvector setup](backend/PGVECTOR_SETUP.md). Verify both inference and tool-calling support with
your account. Restart the API after configuration changes.

Reprocess documents in NIM mode to generate embeddings. Retrieval excludes chunks
from a different embedding model. The backend uses `ChatNVIDIA.bind_tools` and
`NVIDIAEmbeddings`. Live NVIDIA booking proposals, confirmation, embeddings and cited RAG were
verified with fictional data on 14 October 2026. The configured hosted embedding
model is `nvidia/nemotron-3-embed-1b` at 2048 dimensions. The previous E5 model
returned HTTP 410 (retired). Deterministic provider tests also cover failures. PostgreSQL integration
tests exercise actual pgvector ranking and access filters when TEST_POSTGRES_URL is set. In NIM mode, initialization
creates fictional records without external indexing. Process the seeded policies
from Knowledge base after configuring pgvector and NVIDIA.

See [NVIDIA LangChain integration](https://github.com/langchain-ai/langchain-nvidia)
and [NIM tool calling](https://docs.nvidia.com/nim/large-language-models/1.12.0/function-calling.html).

## Access rules

- Patients access only their own private records, plus approved public hospital/doctor information.
- Doctors access patients covered by active assignments or non-expired care grants.
- Private doctor contact fields require that doctor's identity or administrative permission.
- `clinical_records` is separate from admin permissions; the seeded admin does not have it.
- Documents have public, doctor, restricted-admin or private-patient audiences.
- Retrieval applies document ownership, current care grants, audience, embedding-model and dimension checks in the same SQL statement as pgvector cosine ranking. Chunks, embeddings and indexing status commit together.
- Downloads, tools and changes use the same backend checks. Chat cannot supply a new role or identity.
- Confirmation rechecks access and business rules. Revoking a grant blocks pending clinical actions.
- Conversations belong to their author. Historical answers are redacted when their underlying access is revoked. Stored answers are not supplied to the model as clinical evidence; each request retrieves currently authorised data.
- Operational monitoring exposes metadata. Sensitive conversation monitoring additionally requires `monitor_sensitive` and `clinical_records`.

## Verification

See [verification results](VERIFICATION_REPORT.md) and the [demo guide](DEMO_GUIDE.md).
The repeatable PostgreSQL/live runner is documented in [pgvector setup](backend/PGVECTOR_SETUP.md).

From the project root:

```powershell
.\.venv\Scripts\python.exe -m pytest -c V1\backend\pytest.ini V1\backend\tests
```

SQLite fixtures cover isolation, sessions, grants, uploads, RAG audiences, action
expiry/replay and mocked NIM tools. PostgreSQL concurrency verification runs only
with `TEST_POSTGRES_URL` set to a dedicated test database. It creates and removes
an isolated temporary schema; never use a production database for this test.

For browser tests, start the demo API and frontend, then:

```powershell
Set-Location V1\frontend
node node_modules/@playwright/test/cli.js install chromium
npm run test:e2e
```

## Operating boundaries

Local files are served only through authenticated downloads. Back up the database
and storage together. Use secure cookies behind HTTPS. Keep credentials and
runtime files out of Git. Login throttling is per process for this local application;
multi-process deployments need a shared limiter.

Processing limits: 10 MB upload, 100 PDF pages, 300,000 extracted characters.
Text PDFs, TXT and MD are indexable. PNG/JPG support protected downloads, without
OCR. Document processing is an explicit request with retry support.
SMS, scheduled reminders, OCR and payment-gateway charges are outside the approved
scope. Payments record funds already received; they do not charge a card.

## Version control

A local Git repository and ignore rules are configured. No commit or remote push
was performed. `.github/workflows/ci.yml` checks PostgreSQL migrations, backend
permissions/concurrency, TypeScript and the frontend build when pushed to GitHub.
The workflow has not been run remotely from this workspace.
