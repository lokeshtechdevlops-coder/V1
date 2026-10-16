# Verified hospital workflow demonstration

Use fictional accounts and records only. Current implementation: React/Vite,
FastAPI, PostgreSQL/pgvector, LangGraph and NVIDIA NIM. Redis/Celery are excluded.

## Start the application

Stop the existing backend before restarting it so it reloads the updated model
settings. From the project root:

```powershell
.\V1\backend\run.ps1 -Initialize
```

In another terminal:

```powershell
Set-Location V1\frontend
npm run dev
```

Frontend: http://localhost:3000. API docs: http://localhost:8000/docs.
The hosted embedding configuration is `nvidia/nemotron-3-embed-1b` with
`EMBEDDING_DIMENSIONS=2048`. Keep API keys in the backend environment only.

## Prepare demo documents

The four Markdown files in [demo_documents](demo_documents) are fictional policies,
not approved policies for real hospital operations. An administrator should review
them for the demonstration, upload them through **Knowledge base** with public
audience, then process each document in NIM mode. Use the real hospital's reviewed
policies for a real deployment. Reprocess any documents indexed with the retired
embedding model. A document marked indexed in offline demo mode has no semantic
embeddings and also needs processing in NIM mode.

## Demonstration sequence

1. Sign up a new patient, including name, date of birth and gender. Verify the new
   patient cannot see the existing fictional patients' reports or prescriptions.
2. Request a doctor account. Verify sign-in fails before approval. As Admin, approve
   the doctor from **Accounts**, specifying department and specialisation.
3. Grant that doctor access to the new patient from **Care access**. As Doctor,
   create availability. As Patient, book an available slot. Reload the page and
   confirm the appointment remains. A second patient must not reserve the same slot.
4. As Doctor, record a fictional consultation note, prescription and report for the
   assigned patient. As Admin, create an invoice and record a fictional payment
   already received. As Patient, verify the records and bill persist after sign-out
   and sign-in. There is no payment-gateway charge.
5. In AI Assistant, ask: "Find an available cardiologist appointment." Then select
   an available result and ask the assistant to book that specific slot. Verify the
   proposal before confirming. The appointment must not exist until confirmation.
6. Ask: "Show my latest report." Verify the report belongs to the signed-in patient.
7. Ask: "According to the visiting-hours policy, what are the visiting hours?"
   Verify the citation points to the uploaded policy. Deactivate that policy and
   verify subsequent retrieval excludes it. If no approved evidence remains, the
   assistant must not invent policy details.
8. Ask for another patient's report. Verify access is denied. Revoke the doctor's
   care grant, then verify reports, downloads, saved clinical chat history and
   pending clinical actions are blocked or redacted for that doctor.

Seeded fictional users use `DemoHospital!2026`: patient@carenexus.local,
patient2@carenexus.local, doctor@carenexus.local and admin@carenexus.local.
Seed creation skips databases that already contain users.

## Repeat verification

```powershell
.\.venv\Scripts\python.exe V1\backend\scripts\verify_project.py
# Opt-in: also send fictional test inputs to NVIDIA.
.\.venv\Scripts\python.exe V1\backend\scripts\verify_project.py --live
```

The runner creates temporary PostgreSQL schemas, runs migrations, checks schema
drift, exercises API workflows and cleans up. Tests do not use existing hospital
records. Each run saves logs, JUnit results and a summary under
`V1/storage/verification/run_*`. The live tests verify an actual booking proposal,
confirmation, embeddings, cited answers and document deactivation.

Browser tests require a demo API and frontend. Set `E2E_BASE_URL` and
`E2E_API_URL` to isolated preview ports to avoid creating test accounts in your
normal hospital database, then run `npm run test:e2e` from `V1/frontend`.

## Remaining report scope

The graph still routes each request to one domain with restricted tools. Explicit
cross-domain planning, email delivery, scheduled reminders and deployment are
separate milestones. Clarify the report's "Exam Timetable" requirement before
adding a laboratory/test scheduling module. Do not claim these are implemented.
