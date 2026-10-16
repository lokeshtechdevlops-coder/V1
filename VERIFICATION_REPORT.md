# Hospital workflow and AI verification

Verified on 14 October 2026. Scope: the first four priorities from the report review:
complete hospital journey, live NVIDIA integration, RAG and access restrictions.

## Results

| Check | Result | Evidence |
| --- | --- | --- |
| Full PostgreSQL/provider-free suite | 44 passed; 2 live checks intentionally skipped | [Run logs and summary](storage/verification/run_20261014T164133Z_018b9ec0/) |
| Live NVIDIA integration suite | 45 passed, including both live checks, before the additional service-failure regression was added | [JUnit](storage/verification/postgres-tests.xml), [log](storage/verification/backend.log) |
| Provider outage regression | Passed: neutral response, no booking/action, no provider-detail disclosure | [JUnit](storage/verification/provider-failure.xml) |
| Browser workflows | 7 passed against built Vite frontend and isolated demo API | [Last-run result](storage/verification/browser-last-run.json) |
| TypeScript and production frontend build | Passed | Vite production bundle generated in `frontend/dist` |
| Project database migration | Applied 0007; model/schema check passed | [Migration result](storage/verification/project-migration.json) |
| Existing hospital data | Row counts unchanged across all 21 application tables during migration | Same migration result |

The final coverage comprises 44 provider-free checks and 2 actual NVIDIA checks,
plus 7 browser checks. Live checks used fictional data only. Temporary PostgreSQL
schemas were removed after verification; browser tests used a separate SQLite file.

## Hospital journey exercised

Patient signup with birth date/gender; inactive doctor signup; administrator
approval with department/specialisation; care grant; availability; appointment;
clinical note; prescription; private report upload/download; invoice; recorded
payment; consultation completion; sign-out/sign-in and persistence. A different
patient, unassigned doctor and ordinary admin cannot download the private report.
Revoking the care grant also removes the doctor's access.

## AI and RAG exercised

- Real NVIDIA routing and tool calls produce a pending booking proposal.
- No appointment is inserted before explicit confirmation. Confirmed action status
  survives conversation reload.
- A fictional approved document is uploaded and embedded through NVIDIA; real
  pgvector retrieval finds it and the chat answer includes the correct citation
  and the document's verification code.
- Deactivation removes the document from subsequent retrieval.
- PostgreSQL tests enforce patient scope even when an unauthorised document has
  a closer vector. Other tests cover revoked grants, saved-history redaction,
  protected downloads, action expiry/replay, and concurrent double-booking.
- Provider failure returns a neutral message without creating appointments or
  proposals or disclosing the internal exception.

## Fixes delivered

The previous `nvidia/nv-embedqa-e5-v5` endpoint returned HTTP 410 (retired).
The replacement `nvidia/nemotron-3-embed-1b` was verified live at its native
2048 dimensions. Backend `.env`, defaults and `.env.example` were updated.
See [NVIDIA model documentation](https://docs.nvidia.com/nim/nemo-retriever/embedding/2.2/support-matrix.html).

Migration 0007 removes the fixed vector-size modifier without deleting embeddings,
text or ownership information. SQL checks both embedding model and actual dimension
inside a CASE expression before cosine distance, so historical vectors are safe to
retain and cannot be compared against an incompatible query vector.

Test fixtures now create their own tables even when identically named tables exist
later in PostgreSQL's search path. Migration version tables are scoped correctly.
Manual diagnostic scripts no longer open database connections during test collection.
The verification runner writes separate result folders for subsequent runs.

## Use and remaining work

Follow [DEMO_GUIDE.md](DEMO_GUIDE.md). Restart an already-running backend to reload
the new environment settings. Reprocess documents in NIM mode after changing the
embedding model. Four fictional sample policies are provided in `demo_documents`;
review them for the demonstration before uploading/indexing.

The graph remains a single-domain router with restricted tools. Explicit
cross-domain planning, email delivery, scheduled reminders, a defined exam/test
timetable, and cloud deployment are later milestones. No deployment or GitHub push
was performed. The installed NVIDIA SDK emits a model-registry warning for the new
embedding model; actual inference and retrieval passed despite that warning.
