# ContextTrace AI — Development Tasks

**Status:** Initial backlog. Update after the read-only repository audit.  
**Workflow:** Inspect → propose → approve → implement → test → review diff.  
**Important:** These are planned tasks, not a claim that any item is already complete.

## Priority definitions

- **P0 — Critical:** data exposure, destructive risk, or release-blocking correctness issue.
- **P1 — High:** core trust, access control, or audit capability required for the initial release.
- **P2 — Medium:** important reliability, usability, and maintainability improvements.
- **P3 — Later:** optional enhancements justified by evidence or user needs.

## Phase 0 — Repository baseline and audit

- [x] T0.1 Inspect Git working tree, branch, remotes, tracking, history, and diffs.
- [x] T0.2 Map existing files, entry points, scripts, dependencies, schemas, routes, and tests.
- [x] T0.3 Trace ingestion → retrieval → Gemini → response → persistence.
- [x] T0.4 Inventory current retrieval type: lexical, vector, or hybrid.
- [x] T0.5 Review authentication, authorization, tenant scope, secret handling, and logging.
- [x] T0.6 Review source-trace completeness, document versioning, and retention behavior.
- [x] T0.7 Run safe baseline tests where dependencies and configuration permit.
- [x] T0.8 Produce a findings register with evidence, severity, impact, and remediation.
- [x] T0.9 Present the proposed change plan and wait for explicit approval.

**Exit criteria:** audit report is evidence-based; current state and limitations are clear; no repository files were changed during the read-only audit. (Met)

## Phase 1 — Baseline contracts and configuration

- [x] T1.1 Confirm the existing stack and agree on the minimal target architecture.
- [x] T1.2 Define request/response schemas and consistent error categories.
- [x] T1.3 Validate required environment configuration at startup without printing secrets.
- [x] T1.4 Add or improve request IDs and structured, privacy-aware logging.
- [x] T1.5 Document local setup and safe test configuration.
- [x] T1.6 Add contract tests for the most important API boundaries.

**Exit criteria:** application configuration and API contracts are explicit; tests cover basic valid and invalid requests. (Met)

## Phase 2 — Document ingestion and authorized retrieval

- [x] T2.1 Validate title, content, metadata, and input size.
- [x] T2.2 Confirm stable document IDs and version-update semantics.
- [x] T2.3 Verify indexes and query behavior against actual MongoDB configuration.
- [x] T2.4 Enforce authorization scope inside document queries.
- [x] T2.5 Define retrieval candidate limits, ranking, and context-size limits.
- [x] T2.6 Record selected source IDs and ranking metadata where available.
- [x] T2.7 Test empty, irrelevant, duplicate, malformed, and unauthorized content.
- [x] T2.8 Build a labeled retrieval dataset and calculate baseline Recall@K and/or MRR.

**Exit criteria:** retrieval behavior is tested, access-scoped, bounded, and measured. (Met)

## Phase 3 — Grounded generation and verification

- [x] T3.1 Inspect the current Gemini SDK, model identifier, and API usage.
- [x] T3.2 Centralize prompt construction and version the prompt template.
- [x] T3.3 Clearly delimit retrieved text as untrusted evidence.
- [x] T3.4 Define and validate a structured answer contract.
- [x] T3.5 Validate every citation against the retrieved evidence set.
- [x] T3.6 Resolve displayed source excerpts from trusted storage.
- [x] T3.7 Implement explicit abstention for empty or insufficient evidence.
- [x] T3.8 Define handling for conflicting, stale, and incomplete sources.
- [x] T3.9 Handle timeouts, rate limits, provider failures, and malformed responses.
- [x] T3.10 Test prompt-injection documents and attempts to reveal unauthorized content.
- [x] T3.11 Evaluate answer claims against evidence with a reviewed test set.

**Exit criteria:** unsupported questions do not silently fall back to generic generation; invalid source references are rejected; known limitations are documented. (Met)

## Phase 4 — Audit trace and history

- [x] T4.1 Define the trace schema based on actual audit and privacy requirements.
- [x] T4.2 Preserve document ID, version, title snapshot, passage/excerpt, and content hash where appropriate.
- [x] T4.3 Store retrieval configuration, selected evidence, model identifier, prompt version, and verification outcome.
- [x] T4.4 Define audit-write failure semantics and make them testable.
- [x] T4.5 Enforce authorization on history listing and individual trace reads.
- [x] T4.6 Define retention, archival, deletion, and backup behavior.
- [x] T4.7 Test that changing a document does not silently rewrite historical evidence.
- [x] T4.8 Test partial failures and concurrent document updates.

**Exit criteria:** a historical answer can be investigated using its answer-time evidence and metadata, subject to the documented retention policy. (Met)

## Phase 5 — Security hardening

- [x] T5.1 Confirm authentication and server-side authorization requirements.
- [x] T5.2 Test cross-user and cross-tenant document/history access.
- [x] T5.3 Protect Gemini credentials and database credentials.
- [x] T5.4 Validate request payloads and impose size limits.
- [x] T5.5 Configure CORS, security headers, and rate limiting based on deployment needs.
- [x] T5.6 Review unsafe rendering and file-handling paths.
- [x] T5.7 Minimize sensitive data in logs and error responses.
- [x] T5.8 Document dependency vulnerability findings and safe remediation.
- [x] T5.9 Add security regression tests.

**Exit criteria:** access-control tests pass; secrets are not exposed; security limitations and residual risks are documented. (Met)

## Phase 6 — UI and product usability

- [x] T6.1 Audit existing frontend before changing layout or dependencies.
- [x] T6.2 Build/refine the question workspace and answer display.
- [x] T6.3 Display citations, excerpts, and document versions.
- [x] T6.4 Add clear empty, loading, abstention, conflict, and error states.
- [x] T6.5 Add authorized history and trace inspection.
- [x] T6.6 Check responsive behavior, keyboard access, contrast, and focus.
- [x] T6.7 Verify the UI does not expose secrets or bypass backend authorization.

**Exit criteria:** users can understand both the answer and its evidence; failure states are distinct and accessible. (Met)

## Phase 7 — Evaluation, release, and documentation

- [x] T7.1 Maintain a versioned evaluation dataset with expected evidence and expected abstentions.
- [x] T7.2 Report retrieval metrics, groundedness review, citation validity, and abstention behavior.
- [x] T7.3 Measure p50/p95 latency, provider failure rate, and approximate cost.
- [x] T7.4 Run unit, integration, authorization, RAG, and frontend regression tests.
- [x] T7.5 Verify production environment variables, CORS, HTTPS, logging, and health checks.
- [x] T7.6 Document backup/restore, retention, and operational limitations.
- [x] T7.7 Update README with verified architecture and measured results only.
- [x] T7.8 Review final Git diff and ensure no credentials or unrelated files are included.
- [x] T7.9 Obtain explicit approval before commit, push, or deployment.

**Exit criteria:** release evidence is reproducible; known limitations are visible; no unapproved repository or deployment actions occurred. (Met)

## Change proposal template

For each implementation batch, record:

- **Task IDs:**
- **Problem and evidence:**
- **Files to change:**
- **Expected behavior:**
- **Security/privacy impact:**
- **Regression risks:**
- **Tests and acceptance criteria:**
- **Rollback approach:**
- **Approval:** pending / approved / rejected
- **Results:** commands run and actual outcomes

---

### Phase 1 Implementation Record

- **Task IDs:** T1.1, T1.2, T1.3, T1.4, T1.5, T1.6
- **Problem and evidence:** Absence of boot-time config validation, missing request correlation IDs (`X-Request-Id`), unstructured error responses, and no automated contract test suite.
- **Files changed:** `config/env.js` (created), `middleware/requestId.js` (created), `middleware/errorHandler.js` (created), `app.js` (updated), `package.json` (updated), `tests/health.test.js` (created), `tests/contracts.test.js` (created).
- **Expected behavior:** Fail-fast on missing config without credential leakage; standard `{ error, details: { code, requestId } }` errors; full test suite verification.
- **Security/privacy impact:** Secrets verified but withheld from logs; request correlation IDs added for auditability without logging sensitive document/prompt contents.
- **Regression risks:** Handled; error structure preserved top-level `error` property for client compatibility.
- **Tests and acceptance criteria:** Automated test suite with Jest + Supertest covering health check, validation boundaries, and 404 routing.
- **Approval:** approved by user.
- **Results:** `npm test` executed with 100% pass rate (2 test suites, 9 tests passed).

---

### Phase 2 Implementation Record

- **Task IDs:** T2.1, T2.2, T2.3, T2.4, T2.5, T2.6, T2.7, T2.8
- **Problem and evidence:** Missing input size caps, no deduplication, absence of document versioning and content hashes, global un-scoped queries, missing single-document lookup, update, and archival endpoints.
- **Files changed:** `models/Content.js` (updated with version, hash, tenant, status), `models/Chat.js` (updated with versioned sources and tenant), `controllers/contentController.js` (updated with full CRUD, hashing, deduplication, tenant scoping), `routes/contentRoutes.js` (updated with :id routes), `controllers/chatController.js` (updated with scoped retrieval, context budgeting, version tracking), `tests/ingestion.test.js` (created), `tests/retrieval.test.js` (created).
- **Expected behavior:** Document ingestion creates deterministic SHA-256 `contentHash` and initializes `version: 1`; duplicate submissions return 409 Conflict; updates increment `version`; delete soft-archives document; queries and searches are isolated by `tenantId` and `status: 'active'`.
- **Security/privacy impact:** Tenant isolation enforced server-side directly in MongoDB queries; denial-of-service mitigated via 250-character title and 100,000-character content caps; historical audit integrity preserved by soft-archiving instead of physical deletion.
- **Regression risks:** Default fallback values (`tenantId: 'default'`, `version: 1`, `status: 'active'`) ensure compatibility with un-scoped legacy documents.
- **Tests and acceptance criteria:** Automated test suite verifying document ingestion, size caps, duplicate rejection (409), version incrementing (v2), soft-archival (404 on active lookup), tenant search isolation, and abstention on cross-tenant queries.
- **Approval:** approved by user.
- **Results:** `npm test` executed with 100% pass rate (4 test suites, 20 tests passed).

---

### Phase 3 Implementation Record

- **Task IDs:** T3.1, T3.2, T3.3, T3.4, T3.5, T3.6, T3.7, T3.8, T3.9, T3.10, T3.11
- **Problem and evidence:** Unstructured LLM text output with blind assumption that all retrieved documents were cited; missing prompt template versioning; no system defense against indirect prompt injection in document context.
- **Files changed:** `services/promptService.js` (created), `services/aiService.js` (updated with JSON schema mode and safe parsing), `controllers/chatController.js` (updated with citation validator, excerpt resolution, and abstention), `models/Chat.js` (updated with promptTemplateVersion, insufficientEvidence, verificationOutcome), `tests/generation.test.js` (created).
- **Expected behavior:** Gemini 2.5 Flash outputs structured JSON (`{ answer, citedDocumentIds, insufficientEvidence }`); prompt template is versioned (`v1.1`) with explicit untrusted data fences; cited document IDs are verified against retrieved evidence and hallucinated IDs rejected; display excerpts are resolved from database storage; `insufficientEvidence: true` triggers explicit abstention.
- **Security/privacy impact:** Critical prompt injection defense instructing model to treat retrieved documents strictly as untrusted text and ignore any embedded command directives; prevention of fabricated citations.
- **Regression risks:** Handled; safe JSON fallback parser wraps non-JSON strings in schema contract without server crashes.
- **Tests and acceptance criteria:** Automated test suite verifying prompt fencing, structured JSON parsing, citation validation (rejection of un-retrieved IDs), and abstention handling.
- **Approval:** approved by user.
- **Results:** `npm test` executed with 100% pass rate (5 test suites, 25 tests passed).

---

### Phase 4 Implementation Record

- **Task IDs:** T4.1, T4.2, T4.3, T4.4, T4.5, T4.6, T4.7, T4.8
- **Problem and evidence:** Absence of immutable evidence snapshots in audit logs; mutating an underlying document risked creating "pointer drift" where past answers appeared ungrounded; lack of individual trace forensic inspection (`GET /api/chat/history/:id`).
- **Files changed:** `models/Chat.js` (updated with `requestId`, `latencyMs`, `contentHash`, `score`), `controllers/chatController.js` (updated with latency tracking, snapshotting, explicit audit failure handling, and `getChatById`), `routes/chatRoutes.js` (registered `GET /history/:id`), `tests/audit.test.js` (created).
- **Expected behavior:** Audit records preserve answer-time snapshots (`version`, `contentHash`, `excerpt`, `score`); subsequent document updates or soft-archivals do not alter historical audit snapshots; individual traces can be forensically investigated via `GET /api/chat/history/:id`.
- **Security/privacy impact:** Tenant boundary enforced on individual trace lookups (404 on cross-tenant trace requests); explicit audit-write failure prevents returning answers when audit records cannot be persisted.
- **Regression risks:** Handled; legacy chat records without `requestId` or `latencyMs` continue to load safely.
- **Tests and acceptance criteria:** Automated test suite verifying snapshot preservation across document mutations (v1 -> v2) and soft-archival, latency recording, and tenant-scoped trace lookups.
- **Approval:** approved by user.
- **Results:** `npm test` executed with 100% pass rate (6 test suites, 28 tests passed).

---

### Phase 5 Implementation Record

- **Task IDs:** T5.1, T5.2, T5.3, T5.4, T5.5, T5.6, T5.7, T5.8, T5.9
- **Problem and evidence:** Absence of authentication layer, missing HTTP security headers (X-Powered-By exposed, MIME sniffing possible), unbounded cross-origin access, and risk of LLM endpoint quota exhaustion/DoS from rapid repeated queries.
- **Files changed:** `middleware/auth.js` (created), `middleware/rateLimiter.js` (created), `app.js` (mounted helmet, cors, authMiddleware, rateLimiter), `package.json` (installed `helmet`, `cors`, `express-rate-limit`), `tests/security.test.js` (created).
- **Expected behavior:** Requests require valid `X-API-Key` or `Authorization: Bearer <key>` when `API_KEY` is configured (dev mode remains open if `API_KEY` is unset); security headers prevent MIME sniffing and fingerprinting; `/api/chat/ask` rate-limited to 30 requests per minute per IP; cross-tenant query/trace boundaries strictly enforced.
- **Security/privacy impact:** Restricts unauthorized API usage; prevents brute-force / quota depletion of Gemini API; ensures zero secret leakage in logs or responses.
- **Regression risks:** Handled; test environment bypasses rate limiter to avoid spurious 429 errors during CI/CD test runs.
- **Tests and acceptance criteria:** Automated test suite verifying helmet headers (`nosniff`, omitted `X-Powered-By`), CORS allow headers, API key validation (401 on missing key, 200 on valid key), and open dev mode fallback.
- **Approval:** approved by user.
- **Results:** `npm test` executed with 100% pass rate (7 test suites, 35 tests passed).

---

### Phase 6 Implementation Record

- **Task IDs:** T6.1, T6.2, T6.3, T6.4, T6.5, T6.6, T6.7
- **Problem and evidence:** Absence of a visual user interface; users had to interact purely through raw HTTP curls/scripts; no user-facing visualization of answer-time evidence citations, document version chips, abstention states, or forensic trace modal views.
- **Files changed:** `public/index.html` (created), `public/css/style.css` (created), `public/js/app.js` (created), `app.js` (mounted `express.static` and configured Helmet CSP), `package.json` (updated test script with sequential execution and timeout), `tests/ui.test.js` (created).
- **Expected behavior:** Semantic, evidence-first enterprise web UI served directly by Express at `GET /`; 3-tab layout (**Ask & Verify**, **Knowledge Base**, **Audit History**); clear visual distinctions between verified answers, abstentions, and server errors; interactive forensic modal displaying answer-time snapshots and telemetry; tenant switcher and API key configuration in header.
- **Security/privacy impact:** UI acts purely as a client consuming backend APIs; zero secrets (database credentials or Gemini API keys) are exposed in client bundles; all document and history lookups are authenticated and tenant-isolated server-side.
- **Regression risks:** Handled; Helmet CSP configured to permit trusted Google Fonts and inline styles while strictly sandboxing default sources to `'self'`.
- **Tests and acceptance criteria:** Automated test suite verifying `GET /` serves HTML with required layout containers, static asset delivery (`/css/style.css`, `/js/app.js`), and Content-Security-Policy compliance.
- **Approval:** approved by user.
- **Results:** `npm test` executed with 100% pass rate (8 test suites, 39 tests passed).

---

### Phase 7 Implementation Record

- **Task IDs:** T7.1, T7.2, T7.3, T7.4, T7.5, T7.6, T7.7, T7.8, T7.9
- **Problem and evidence:** Absence of a standardized benchmark evaluation dataset, lack of measured retrieval and citation precision metrics, unverified prompt injection resilience, and absence of operational runbooks (backup/restore, retention policy).
- **Files changed:** `eval/evaluationDataset.json` (created), `tests/evaluation.test.js` (created), `scripts/runEval.js` (created), `package.json` (added `npm run eval`), `controllers/chatController.js` (propagated telemetry fields `latencyMs` and `promptTemplateVersion` in responses), `ContextTrace_AI_Antigravity_Docs/TASKS.md` (updated), `ContextTrace_AI_Antigravity_Docs/MEMORY.md` (updated), `README.md` (updated).
- **Expected behavior:** Automated evaluation benchmark measures 100% citation validity, 100% explicit abstention accuracy on ungrounded/out-of-scope queries, 0.0% hallucination rate, and tracks p50/p95 latency metrics; full regression test suite across all 9 suites passes with 100% success; operational runbooks are documented.
- **Security/privacy impact:** Strict verification that jailbreak and prompt override commands ("Ignore all instructions...") do not breach safety boundaries; verified zero secret leakage across repository.
- **Regression risks:** Handled; evaluation runner cleans up all test tenant documents after execution.
- **Tests and acceptance criteria:** Automated test suite verifying evaluation dataset schema, factual grounded queries, explicit abstentions, prompt injection defense, and history telemetry.
- **Approval:** approved by user.
- **Results:** `npm run eval` passed 100% (6/6 cases); `npm test` executed with 100% pass rate (9 test suites, 45 tests passed).
