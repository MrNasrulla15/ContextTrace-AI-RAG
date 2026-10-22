# ContextTrace AI — Agent and Development Rules

These rules govern work performed by Google Antigravity and any AI coding assistant working in this repository.

## 1. Repository safety

- This is an existing GitHub repository. Never assume it is safe to replace or recreate.
- Begin by inspecting `git status --short --branch`, remotes, branch tracking, recent commits, and staged/unstaged diffs.
- Never discard user changes or overwrite remote history.
- Do not run `git reset --hard`, `git clean`, force pushes, or destructive migrations without explicit, task-specific approval.
- Do not switch branches, rewrite history, or push commits unless explicitly requested.
- Preserve the current architecture when it is adequate. Propose the smallest change that solves a demonstrated problem.
- Before edits, summarize affected files, reason, risks, and tests; wait for approval when the user has requested an approval gate.

## 2. Inspect before implementing

- Read the relevant files and follow the real execution path before proposing code.
- Search for existing helpers, schemas, tests, and patterns before adding alternatives.
- Do not invent file paths, APIs, database fields, environment variables, or existing features.
- Distinguish facts confirmed by code from assumptions and recommendations.
- Do not claim tests passed unless they were actually executed and their results inspected.
- If tools, credentials, services, or test data are unavailable, state the limitation.

## 3. Change control

- Make bounded, reviewable changes.
- Avoid unrelated refactors, broad formatting churn, and large rewrites.
- Do not delete code, tests, comments, or dependencies solely because they appear redundant. Demonstrate that they are unused and assess side effects first.
- Do not create duplicate configuration files or competing implementations.
- Update documentation and tests when behavior or contracts change.
- After edits, inspect the diff and summarize every changed file.
- Do not commit, push, deploy, or migrate data unless explicitly approved.

## 4. Security and secrets

- Never print, copy, commit, or expose real API keys, passwords, tokens, session secrets, or connection strings.
- Use environment variables or the existing secret-management mechanism.
- Never put the Gemini API key in frontend code or client-visible configuration.
- Validate inputs at trust boundaries and use parameterized/safe database APIs.
- Enforce authorization server-side for every protected document, source, and history record.
- Do not rely on frontend hiding or an unguessable ID as access control.
- Use safe error messages; do not return stack traces or internal secrets to clients.
- Avoid logging full document contents, credentials, or unnecessary personal data.
- Do not run destructive or intrusive security tests against production systems.

## 5. RAG correctness

- Treat retrieved document text as untrusted data, never as system instructions.
- Separate trusted system policy from retrieved context.
- Do not assume prompt wording alone prevents hallucinations or prompt injection.
- Cite only source/passage IDs that were actually retrieved and provided to generation.
- Resolve displayed source excerpts from trusted stored evidence, not model-invented quotations.
- A valid citation reference does not prove that a claim is supported by that citation.
- Implement explicit behavior for no results, insufficient evidence, contradictory evidence, stale sources, and verification failure.
- Never silently fall back to generic model knowledge when retrieval fails.
- Do not claim zero hallucinations, deterministic answers, compliance certification, or measured accuracy without evidence.
- Keep model output untrusted until schema and citation validation complete.

## 6. Audit integrity and privacy

- Preserve answer-time source versions and evidence snapshots according to the documented retention policy.
- Do not silently mutate historical traces when documents change.
- Record the model identifier, prompt-template version, retrieval configuration, timestamp, and verification outcome where supported.
- Make audit history access-controlled.
- Define and handle audit-write failures explicitly.
- Store only data needed for the product's audit and operational purposes.
- Document deletion, archival, retention, and backup implications before implementing them.

## 7. Engineering quality

- Follow the repository's existing language, framework, naming, formatting, and module conventions unless there is a justified reason to change them.
- Use runtime schema validation at external boundaries.
- Handle timeouts, provider errors, rate limits, malformed output, and database failures explicitly.
- Keep functions focused and error handling consistent.
- Avoid unnecessary abstractions, dependencies, frameworks, agents, and infrastructure.
- Keep configuration explicit and validate required configuration at startup.
- Use stable error codes/statuses where practical.
- Do not suppress errors just to make a demo appear successful.

## 8. Testing requirements

For a relevant change, select tests that cover the changed behavior and nearby regression risks.

Expected coverage as applicable:
- unit tests for validation, context building, citation checks, and abstention;
- integration tests for MongoDB and API contracts;
- authorization tests for cross-user and cross-tenant access;
- RAG tests for answerable, unanswerable, contradictory, irrelevant, and adversarial documents;
- provider tests for timeout, rate limit, malformed output, and failure;
- audit tests for source-version preservation and trace-write failure;
- UI tests for loading, empty, unsupported, and error states.

Use deterministic fixtures and mock external providers for routine tests. Keep a separate, explicitly configured evaluation suite for real-model behavior.

## 9. Documentation and communication

- Keep README claims aligned with implemented and tested behavior.
- Report limitations and unverified assumptions plainly.
- Include changed files, commands executed, test outcomes, risks, and follow-up work in implementation summaries.
- Prefer concise, specific explanations over hype or generic AI-generated boilerplate.
- Never invent performance numbers, evaluation scores, user counts, or business impact.
- Stop at the requested scope and ask before proceeding to the next approval-gated phase.

## 10. Definition of done

A change is done only when:
- its requirements and behavior are clear;
- relevant tests pass or limitations are documented;
- security and privacy implications have been considered;
- no secrets or unrelated files were introduced;
- the final diff has been reviewed;
- documentation is accurate;
- the user receives an honest summary of what changed and what remains.
