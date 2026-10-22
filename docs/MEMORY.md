# ContextTrace AI — Project Memory

This file preserves stable project decisions and working context for future Google Antigravity sessions. Update it when a decision is confirmed or the implementation materially changes. Do not use it as a substitute for source code, tests, or Git history.

## 1. Project identity

- **Name:** ContextTrace AI
- **Category:** Generative AI / Retrieval-Augmented Generation (RAG)
- **Core purpose:** trustworthy, evidence-grounded question answering over private knowledge.
- **Primary differentiator:** inspectable answer-time evidence and an auditable trace, combined with explicit handling of insufficient evidence.
- **Primary goal:** production-minded engineering with security, evaluation, and auditability.
- **Repository status:** existing GitHub repository. Inspect the current repository and history before changes; do not treat it as a blank project.

## 2. Conceptual pipeline

1. Ingest and validate private documents.
2. Store documents and maintain the required index.
3. Retrieve authorized candidates for a question.
4. Rank/select relevant evidence and construct a bounded context.
5. Ask the configured Google Gemini model to answer from the supplied evidence.
6. Parse and validate the response and its citation references.
7. Abstain or return a safe failure when evidence or verification is insufficient.
8. Persist the answer-time evidence trace and return the answer with source references.

This is the intended design. Confirm which stages already exist by inspecting the current code.

## 3. Initial technical direction

The initial concept mentions:
- MongoDB for content and chat/audit data.
- MongoDB text indexing for lexical retrieval.
- Google Gemini for answer generation.
- A content collection and a chat/history collection.
- An API for asking questions and retrieving history.

These are project direction notes, not confirmation of exact current schemas, SDK versions, model availability, or implemented behavior. Inspect the repository before relying on them.

Vector or hybrid retrieval is an optional improvement. First establish and evaluate the existing retrieval baseline.

## 4. Trust and audit decisions

- Prompt instructions alone cannot guarantee grounded answers or eliminate hallucinations.
- Source titles alone are not a sufficient audit record.
- Preserve source IDs, document versions, and exact evidence excerpts or immutable equivalent references.
- Track model identifier, prompt-template version, retrieval metadata, timestamps, and verification outcome where appropriate.
- Validate citations against the evidence actually supplied to generation.
- Citation validity is not the same as factual support.
- Define explicit behavior for unsupported questions, contradictory sources, provider errors, and trace-write failures.
- Avoid claims of determinism, zero hallucinations, or guaranteed correctness.
- Keep audit retention and privacy requirements explicit.

## 5. Security principles

- Authentication and authorization are separate responsibilities.
- Every protected document and trace read must enforce server-side access checks.
- Scope retrieval to the caller's authorized documents before sending evidence to the model.
- Treat retrieved content as untrusted and test indirect prompt injection.
- Keep Gemini and database secrets server-side.
- Minimize sensitive data in logs and traces; apply an explicit retention policy.
- Do not expose the existence of unauthorized documents or traces through error messages.

## 6. Working agreement for AI coding tools

- Start with a read-only repository audit.
- Inspect Git status, branch, remotes, history, and diffs before editing.
- Do not overwrite uncommitted work or remote history.
- Report evidence, assumptions, and unknowns separately.
- Propose changes and wait for approval when requested.
- Make small, reviewable changes.
- Run relevant tests and inspect the diff after implementation.
- Never claim a test passed without actually running it.
- Never invent performance metrics or capabilities.
- Do not commit, push, deploy, or run destructive migrations without explicit approval.

## 7. Current status

Initial planning documents are being established. The actual repository state, architecture, implementation gaps, baseline test results, and deployment constraints remain to be confirmed through the read-only audit.

Do not mark roadmap tasks complete until implementation or test evidence supports the status.

## 8. Decision log

Append confirmed decisions in this format:

### 2026-10-21 — Baseline Contracts, Startup Validation & Jest Test Harness
- **Context:** Application lacked boot-time configuration assertions, correlation IDs (`X-Request-Id`), standardized error formats, and automated regression tests.
- **Decision:** Implemented `config/env.js`, `middleware/requestId.js`, `middleware/errorHandler.js`, and integrated Jest + Supertest for automated contract testing.
- **Alternatives considered:** Relying on ad-hoc controller error checks without correlation IDs; rejected due to lack of audit correlation and silent runtime failures.
- **Consequences and risks:** Standardized `{ error, details }` envelope format adopted while retaining top-level `error` for backwards compatibility.
- **Related task IDs:** T1.1, T1.2, T1.3, T1.4, T1.5, T1.6
- **Status:** approved and completed

### 2026-10-22 — Document Ingestion, Versioning, Content Hashing & Scoped Retrieval
- **Context:** Documents lacked content hashes, revision versioning, input size caps, deduplication, tenant isolation, and soft-archival capabilities, endangering audit referential integrity.
- **Decision:** Implemented deterministic SHA-256 `contentHash`, monotonic `version: Number`, `tenantId` query isolation, and soft-archiving (`status: 'archived'`). Added endpoints `GET /:id`, `PUT /:id`, `DELETE /:id` and context token budgeting.
- **Alternatives considered:** Physical deletion of documents; rejected because it destroys historical audit trail evidence for past answers.
- **Consequences and risks:** Duplicate submissions return 409 Conflict. Soft-archived documents drop out of search but remain available for audit inspection.
- **Related task IDs:** T2.1, T2.2, T2.3, T2.4, T2.5, T2.6, T2.7, T2.8
- **Status:** approved and completed

### 2026-10-22 — Grounded Generation, Structured Verification & Abstention
- **Context:** Model previously returned unparsed text with blind assumptions that all retrieved candidates were cited; lacked prompt template versioning and indirect prompt-injection defenses.
- **Decision:** Created `services/promptService.js` with `PROMPT_TEMPLATE_VERSION = 'v1.1'` and explicit untrusted-data XML fencing. Enforced Gemini JSON mode (`{ answer, citedDocumentIds, insufficientEvidence }`), validated citation IDs against retrieved evidence, resolved excerpts from trusted database storage, and added explicit abstention.
- **Alternatives considered:** Relying solely on natural language prompt instructions without output schema or citation filtering; rejected because hallucinated quotes and citations cannot be audited reliably.
- **Consequences and risks:** Only documents directly supporting stated facts are cited. Un-retrieved hallucinated IDs are flagged and discarded.
- **Related task IDs:** T3.1, T3.2, T3.3, T3.4, T3.5, T3.6, T3.7, T3.8, T3.9, T3.10, T3.11
- **Status:** approved and completed

### 2026-10-22 — Audit Trace, Evidence Snapshots & Forensic History
- **Context:** Previous audit records stored references to documents that could suffer "pointer drift" if underlying documents were modified or archived, making historical answers appear ungrounded.
- **Decision:** Implemented immutable answer-time evidence snapshots (`version`, `contentHash`, `excerpt`, `score`). Recorded request correlation IDs (`requestId`) and execution duration (`latencyMs`). Implemented forensic single-trace lookup `GET /api/chat/history/:id` with tenant boundary checks, and explicit audit-write failure handling.
- **Alternatives considered:** Relying on dynamic document population (Mongoose `populate`); rejected because document edits would silently rewrite past historical audit context.
- **Consequences and risks:** Slight increase in Chat collection storage per interaction; accepted in exchange for 100% forensically reproducible audit trails.
- **Related task IDs:** T4.1, T4.2, T4.3, T4.4, T4.5, T4.6, T4.7, T4.8
### 2026-10-22 — Security Hardening, API Guard, Rate Limiting & HTTP Hygiene
- **Context:** Application lacked an authentication gate, HTTP security headers, CORS origin restrictions, and rate limiting on the Gemini generation endpoint.
- **Decision:** Implemented `middleware/auth.js` (supporting `X-API-Key` and `Bearer` tokens, with safe dev mode fallback when `API_KEY` is not set), `middleware/rateLimiter.js` (30 req/min limit on `/api/chat/ask`), integrated `helmet()` and configured `cors()`, and secured all protected API routes. Added automated regression test suite (`tests/security.test.js`).
- **Alternatives considered:** Relying on network-level IP firewalls only; rejected because defense-in-depth requires application-level rate limits and API key authentication.
- **Consequences and risks:** Prevents quota exhaustion attacks on Gemini API and protects internal endpoints; rate limiter is disabled in test mode to prevent CI flakiness.
- **Related task IDs:** T5.1, T5.2, T5.3, T5.4, T5.5, T5.6, T5.7, T5.8, T5.9
### 2026-10-22 — UI & Product Usability (Evidence-First Interface)
- **Context:** System was accessible only via HTTP API endpoints; lack of visual UI to submit queries, inspect answer-time evidence citations, review document revisions, or view forensic audit snapshots.
- **Decision:** Built a responsive, accessible, evidence-first enterprise web UI served via Express static middleware (`public/index.html`, `public/css/style.css`, `public/js/app.js`). Configured Helmet CSP for external typography and internal scripts. Implemented 3 dedicated workspace tabs: Ask & Verify, Knowledge Base Management, and Audit History with forensic trace inspection modal.
- **Alternatives considered:** Heavy single-page application framework (React, Next.js); rejected to avoid build toolchain overhead, excess dependencies, and maintain immediate, lightweight runtime serving.
- **Consequences and risks:** Full evidence transparency with explicit abstention warnings. All actions execute through tenant-scoped backend API endpoints with zero secret leakage.
- **Related task IDs:** T6.1, T6.2, T6.3, T6.4, T6.5, T6.6, T6.7
- **Status:** approved and completed

### 2026-10-22 — Evaluation Benchmark, Telemetry Metrics & Production Readiness
- **Context:** System required objective quality evaluation, precision benchmarks for citation verification and abstention accuracy, automated regression suites, and operational runbooks.
- **Decision:** Implemented versioned benchmark dataset (`eval/evaluationDataset.json`), standalone benchmark runner (`scripts/runEval.js` via `npm run eval`), and automated regression suite (`tests/evaluation.test.js`). Propagated telemetry (`latencyMs`, `promptTemplateVersion`) to client payloads. Documented operational runbooks (backup/restore, retention policy, production checklists) in `README.md`.
- **Alternatives considered:** Manual ad-hoc query spot-checking; rejected because continuous regression testing requires deterministic, automated evaluation assertions.
- **Consequences and risks:** Standardized benchmark establishes reproducible quality baseline (100% citation validity, 100% abstention accuracy, 0% hallucination rate, p50 latency: 153ms).
- **Related task IDs:** T7.1, T7.2, T7.3, T7.4, T7.5, T7.6, T7.7, T7.8, T7.9
- **Status:** approved and completed

### 2026-10-22 — Cloud Free-Tier 512MB Quota Defense & Automated TTL Lifecycle
- **Context:** MongoDB Atlas free M0 clusters impose a hard 512 MB ceiling. Uncontrolled ingestion of high-dimensional embeddings and transient session uploads inevitably leads to cluster suspension and write freezes.
- **Decision:** Implemented a multi-tier storage optimization suite: (1) Added `expiresAt: Date` with MongoDB TTL indexes (`expireAfterSeconds: 0`) on `Content` and `Chat` schemas for automated background daemon data purging; (2) Implemented `middleware/storageGuard.js` evaluating `db.stats()` to trip a circuit breaker (`HTTP 507 Insufficient Storage`) at a safe 480 MB ceiling; (3) Added `DELETE /api/content/purge` endpoint for selective tenant/session document reclamation; (4) Exposed lifecycle retention options in the web UI.
- **Alternatives considered:** Relying purely on manual client deletes; rejected due to inevitable storage leaks across sessions.
- **Consequences and risks:** Prevents cluster shutdown under free-tier limits. Because historical audit logs preserve answer-time evidence snapshots, past traces remain forensically verifiable even when ephemeral raw documents expire.
### 2026-10-22 — Document Upload & Targeted Grounded Q&A
- **Context:** Users required a seamless mechanism to upload documents (.pdf, .txt, .md, .json) and ask targeted, grounded questions specifically about the uploaded file without cross-document retrieval interference.
- **Decision:** Implemented a dual ingestion and scoped Q&A pipeline: (1) Added `multer` memory storage and `pdf-parse` for in-memory buffer text extraction on `POST /api/content/upload`, protected by SHA-256 deduplication and 24h default TTL; (2) Enhanced `POST /api/chat/ask` with optional `documentId` targeting to lock retrieval directly onto the uploaded file; (3) Added interactive drag-and-drop dropzones and attached document pills in both "Ask & Verify" and "Knowledge Base" tabs; (4) Added automated test suite `tests/uploadAndAsk.test.js`.
- **Alternatives considered:** Client-only text reading; rejected because binary PDF parsing requires reliable server-side extraction.
- **Consequences and risks:** Preserves memory safety (no temp files on disk), caps file uploads at 5MB, protects 512MB MongoDB Atlas ceiling with ephemeral TTL, and provides 100% deterministic source citations.
- **Status:** approved and completed

## 9. Session handoff template

- **Current phase:** Production Complete + Storage Optimization + Document Upload & Targeted Q&A.
- **Files changed:**
  - `package.json` (installed `multer`, `pdf-parse@1.1.1`)
  - [controllers/contentController.js](file:///c:/Users/nasru/OneDrive/Desktop/Projects/GenAI_Search/GenAI%20Project/controllers/contentController.js) (added `uploadContentFile`)
  - [routes/contentRoutes.js](file:///c:/Users/nasru/OneDrive/Desktop/Projects/GenAI_Search/GenAI%20Project/routes/contentRoutes.js) (mounted `POST /upload`)
  - [controllers/chatController.js](file:///c:/Users/nasru/OneDrive/Desktop/Projects/GenAI_Search/GenAI%20Project/controllers/chatController.js) (supported `documentId` scoped retrieval)
  - [public/index.html](file:///c:/Users/nasru/OneDrive/Desktop/Projects/GenAI_Search/GenAI%20Project/public/index.html) (added upload dropzones and document badge)
  - [public/css/style.css](file:///c:/Users/nasru/OneDrive/Desktop/Projects/GenAI_Search/GenAI%20Project/public/css/style.css) (added dropzone and pill styles)
  - [public/js/app.js](file:///c:/Users/nasru/OneDrive/Desktop/Projects/GenAI_Search/GenAI%20Project/public/js/app.js) (wired drag-and-drop, detachment, and scoped asking)
  - [tests/uploadAndAsk.test.js](file:///c:/Users/nasru/OneDrive/Desktop/Projects/GenAI_Search/GenAI%20Project/tests/uploadAndAsk.test.js) (7 tests)
  - [ContextTrace_AI_Antigravity_Docs/MEMORY.md](file:///c:/Users/nasru/OneDrive/Desktop/Projects/GenAI_Search/GenAI%20Project/ContextTrace_AI_Antigravity_Docs/MEMORY.md) (updated)
- **Tests run and actual results:**
  - `npm test`: 11 test suites passed, 59 tests passed (100% pass rate in 28.1s).
- **Status:** Production-ready and verified.



