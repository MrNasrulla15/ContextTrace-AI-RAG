# ContextTrace AI — Product and UI Design

**Design direction:** calm, precise, evidence-first enterprise software.  
**Audience:** people who need answers from internal knowledge and need to verify them.  
**Principle:** the interface should make evidence and uncertainty visible, not make AI look magical.

## 1. Experience principles

1. **Evidence before decoration:** citations and supporting passages are first-class UI elements.
2. **Clear uncertainty:** distinguish an answer, an abstention, and a technical failure.
3. **Inspectable by default:** users can open a source and understand why it was selected.
4. **Quiet visual hierarchy:** avoid gradients, glowing AI motifs, excessive animation, and generic chatbot styling.
5. **Accessible:** keyboard operation, semantic markup, visible focus, readable contrast, and meaningful labels.
6. **Honest status:** never show a “verified” indicator unless the defined verification checks actually passed.

## 2. Information architecture

Primary navigation:
- **Ask:** question workspace and answer results.
- **Documents:** authorized content library and ingestion status.
- **History:** previous requests and audit traces.
- **Settings / Administration:** only for authorized roles; access policy and configuration should remain server-controlled.

The UI must not expose navigation or controls as a substitute for backend authorization.

## 3. Main question workspace

Suggested desktop layout:

```text
┌─────────────────────────────────────────────────────────────┐
│ ContextTrace AI                           Documents  History │
├──────────────────────┬──────────────────────────────────────┤
│ Ask a question       │ Answer                               │
│                      │                                      │
│ [ Question input  ]  │ Concise grounded response            │
│ [ Ask ]              │                                      │
│                      │ Sources                               │
│ Recent questions     │ [1] Policy title · Version 3          │
│                      │     Supporting excerpt                │
│                      │ [2] Procedure title · Version 1       │
│                      │     Supporting excerpt                │
│                      │                                      │
│                      │ View evidence trace                   │
└──────────────────────┴──────────────────────────────────────┘
```

Use a responsive single-column layout on small screens. Avoid a permanent oversized sidebar if it reduces space for answer and source inspection.

## 4. Answer presentation

Each answer should include:
- concise answer text;
- inline or numbered source references;
- source cards with title, version, and exact supporting excerpt;
- a control to open the authorized source;
- a clear status for evidence sufficiency and verification;
- an audit-trace view with request ID and relevant metadata where permitted.

Do not equate these statuses:
- **Evidence found:** retrieval returned candidates.
- **Citations validated:** citation IDs map to supplied evidence.
- **Grounding evaluated:** claims were assessed against evidence using a defined method.
- **Audit persisted:** the required trace was successfully stored.

A simple citation-validation pass must not be labeled as proof of factual correctness.

## 5. Required states

### Initial
Explain what the product searches and show a short example question without inventing company policy.

### Loading
Use restrained progress feedback. If possible, show stages such as “Searching documents” and “Checking source references,” but only if the backend actually exposes these stages.

### Answered
Display the answer and its sources together. Keep the evidence one click away or visible by default.

### No matching documents
Say that no relevant documents were found. Do not ask the model to answer from general knowledge as a fallback.

### Insufficient evidence
Explain that the available material does not establish a reliable answer. Optionally show the relevant but incomplete evidence.

### Conflicting sources
Show that sources disagree, identify versions/dates where available, and avoid choosing a winner without a documented policy.

### Provider or system error
Use a safe message and a retry action where appropriate. Do not display stack traces, keys, internal prompts, or database errors.

### Unauthorized
Do not leak whether another user's private document or trace exists.

### Empty history
Explain that no prior requests are available in the current authorized scope.

## 6. Visual system

Use existing project tokens if they are coherent. Otherwise start with a restrained palette:
- deep navy or charcoal for primary text and navigation;
- white or warm-neutral surfaces;
- muted gray for secondary information;
- one accessible blue accent for primary actions and links;
- semantic success, warning, and error colors used sparingly.

Avoid purple AI gradients, glassmorphism-heavy panels, neon borders, decorative robot imagery, and excessive rounded cards. Use consistent spacing, typography, borders, and focus styles.

## 7. Typography and layout

- Use a readable sans-serif font stack.
- Establish a small type scale for page titles, section headings, body text, metadata, and code-like identifiers.
- Keep line lengths comfortable for reading evidence excerpts.
- Use monospace only for IDs, hashes, and technical metadata where it helps.
- Make document titles, version labels, and excerpts visually distinct without overusing bold text.
- Prefer stable layouts that do not jump when citations or status labels appear.

## 8. Interaction and accessibility

- All actions work by keyboard and have visible focus states.
- Icon-only buttons have accessible names.
- Inputs have persistent labels and useful validation errors.
- Status changes are announced appropriately to assistive technology.
- Color is never the only way to convey a status.
- Source excerpt expansion and trace panels have clear open/close controls.
- Respect reduced-motion preferences.
- Check contrast and responsive behavior before release.

## 9. Security and privacy in the UI

- Never ship provider API keys to the browser.
- Render document content as text by default; sanitize any supported rich content.
- Do not display documents or trace records without authorization from the server.
- Avoid placing private question text in URLs, analytics events, or third-party telemetry.
- Confirm destructive document actions and clearly explain their retention/audit consequences.
- Do not expose hidden prompts, internal credentials, or another user's trace metadata.

## 10. Design acceptance checklist

- Users can distinguish grounded answers, abstentions, conflicting evidence, and technical errors.
- Citations expose the actual stored evidence and source version.
- The UI never labels citation existence as factual verification.
- Unauthorized source/history access is denied server-side.
- Layout works on mobile and desktop.
- Keyboard navigation, focus, contrast, and accessible names are checked.
- Loading, empty, error, and long-answer states are tested.
- The interface remains useful without decorative animation or AI-themed visual effects.
