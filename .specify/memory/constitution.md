<!--
  Sync Impact Report
  ==================================================
  Version change: 0.0.0 (template) → 1.0.0 (initial ratification)
  Modified principles: N/A (initial creation from template)
  Added sections:
    - 12 Core Principles (Articles I–XII)
    - Compliance Gates section
    - Git Commit Discipline section
  Removed sections:
    - [SECTION_2_NAME] and [SECTION_3_NAME] replaced with
      concrete sections
  Templates requiring updates:
    - .specify/templates/plan-template.md — ✅ compatible
      (Constitution Check section is generic, will be filled
      per-feature referencing these 12 articles)
    - .specify/templates/spec-template.md — ✅ compatible
      (spec requirements align with RTL, ZATCA, offline,
      and accounting principles)
    - .specify/templates/tasks-template.md — ✅ compatible
      (task phases accommodate constitution-driven gates;
      commit discipline enforced post-implementation)
  Deferred items: None
  ==================================================
-->

# إيجار برو (Ijar Pro) Constitution

## Core Principles

### I. Frontend Design Excellence (NON-NEGOTIABLE)

When implementing ANY user-facing component, page, layout,
dashboard, landing page, form, or UI element, the agent MUST
use the **frontend-design skill/plugin**.

- Before writing ANY frontend code, the agent MUST read and
  follow the frontend-design skill instructions.
- The agent MUST commit to a bold, intentional aesthetic
  direction — not generic AI-generated defaults.
- The agent MUST choose distinctive typography (never Inter,
  Roboto, Arial, or system fonts as primary choices). For this
  Arabic-first app, select premium Arabic web fonts (e.g., IBM
  Plex Arabic, Noto Kufi Arabic, Tajawal, Cairo) paired with a
  complementary Latin font.
- The agent MUST create a cohesive color theme using CSS
  variables — no scattered, inconsistent color values.
- The agent MUST apply meaningful micro-interactions,
  animations, and transitions that enhance the UX.
- The agent MUST ensure full RTL layout compatibility in every
  design decision.
- Every page and component MUST look production-grade,
  polished, and professional — never like a prototype or
  wireframe.

**Rationale**: The users are property management companies in
Saudi Arabia. The UI MUST convey trust, professionalism, and
modernity. Generic-looking interfaces undermine confidence.

**Gate**: If a task involves ANY frontend work (HTML, JSX,
React component, CSS, Tailwind, page layout, responsive
design), the agent MUST confirm it has consulted the
frontend-design skill BEFORE writing code. Failure to do so
is a CRITICAL violation.

### II. Firebase CLI-First Database Operations (NON-NEGOTIABLE)

When dealing with ANY database-related operations — Firestore
schema setup, security rules, indexes, data seeding,
migrations, emulator configuration, or deployment — the agent
MUST use the **Firebase CLI** (`firebase` command-line tool).

- The agent MUST use `firebase init firestore` for initial
  Firestore setup and configuration.
- The agent MUST define and deploy Firestore security rules
  via `firebase deploy --only firestore:rules` — never
  manually through the Firebase Console.
- The agent MUST define and deploy Firestore indexes via
  `firestore.indexes.json` and
  `firebase deploy --only firestore:indexes`.
- The agent MUST use the Firebase Local Emulator Suite
  (`firebase emulators:start`) for all local development and
  testing — never connect to production Firestore during
  development.
- The agent MUST use `firebase deploy` for all deployment
  operations.
- The agent MUST maintain `firebase.json`, `firestore.rules`,
  and `firestore.indexes.json` as version-controlled
  source-of-truth files in the project repository.
- For data seeding or migration scripts, the agent MUST use
  the Firebase Admin SDK executed via CLI scripts — never
  manual Console edits.

**Rationale**: Firebase CLI ensures reproducible,
version-controlled, and auditable infrastructure changes.
Manual Console operations are error-prone, non-reproducible,
and invisible to version control.

**Gate**: If a task involves ANY Firestore operation (rules,
indexes, schema design, deployment, emulator setup), the agent
MUST use Firebase CLI commands. Any instruction to "go to the
Firebase Console and..." is a CRITICAL violation.

### III. Git Commit Discipline After Implementation (NON-NEGOTIABLE)

After `/speckit.implement` finishes successfully — meaning all
tasks in a task group or the full task list are completed and
verified — the agent MUST automatically commit all changes to
git with a properly structured commit message.

- The agent MUST stage all relevant changed files using
  `git add`.
- The agent MUST create a commit with a message following this
  exact template:

  ```
  feat(TASK_ID): SHORT_DESCRIPTION

  - Implemented: BRIEF_LIST_OF_WHAT_WAS_DONE
  - Spec: FEATURE_SPEC_REFERENCE
  - Task: TASK_ID from tasks.md
  ```

- If multiple tasks were completed in a single implementation
  run, the agent MUST create ONE commit per completed task —
  not one giant commit for everything.
- The agent MUST NOT leave uncommitted changes after a
  successful implementation.
- The agent MUST NOT commit if the implementation has errors
  or failing tests — fix first, then commit.
- If the task involves both frontend and backend changes, all
  related changes go in the same commit for that task.

**Rationale**: Granular, well-messaged commits are essential
for debugging, reverting, and understanding project history.
The speckit SDD approach loses its traceability benefits if
implementation artifacts are not properly committed.

**Gate**: After `/speckit.implement` completes successfully,
the agent MUST verify that `git status` shows no uncommitted
changes related to the completed tasks. Uncommitted work after
successful implementation is a CRITICAL violation.

### IV. Arabic-First, RTL-First Development (NON-NEGOTIABLE)

Arabic is the primary language. Every component, page, and
layout MUST be designed and implemented RTL-first.

- Use CSS logical properties (`margin-inline-start`,
  `padding-inline-end`, `inset-inline-start`) instead of
  physical properties (`margin-left`, `padding-right`, `left`).
- Use Tailwind's RTL utilities or `dir="rtl"` at the document
  level with logical property support.
- All text content, labels, buttons, navigation, error
  messages, and system notifications MUST have Arabic
  translations as the default, with English as the secondary
  option.
- All date displays MUST show both Hijri and Gregorian
  calendars.
- Currency MUST always display as SAR (ر.س) with proper
  Arabic formatting.
- Number formatting MUST use Arabic-Indic numerals
  (٠١٢٣٤٥٦٧٨٩) in Arabic mode.

**Rationale**: The target market is Saudi Arabia. Arabic users
MUST feel the app was built for them natively, not adapted
from an English-first product.

### V. ZATCA Compliance Integrity (NON-NEGOTIABLE)

Every financial document (invoice, credit note, debit note)
MUST comply with ZATCA Phase 1 simplified tax invoice
requirements.

- QR codes MUST encode TLV (Tag-Length-Value) Base64 data with
  exactly these fields: seller name, VAT number, invoice
  timestamp, total with VAT, VAT amount.
- QR code generation MUST work entirely client-side
  (offline-capable).
- Invoice sequential numbering MUST be maintained without
  gaps — even across offline/sync scenarios.
- Invoices MUST NEVER be physically deleted — only cancelled
  via credit notes.
- Credit notes for cancellations and updates MUST reference
  the original invoice number.
- All timestamps MUST use Saudi Arabia timezone (UTC+3).

**Rationale**: ZATCA non-compliance exposes the company to
regulatory penalties. This is a legal requirement, not a
preference.

### VI. Double-Entry Accounting Automation (NON-NEGOTIABLE)

Every financial action MUST automatically generate a balanced
double-entry journal entry.

- Creating an invoice → Debit Accounts Receivable, Credit
  Revenue + VAT Payable.
- Receiving payment → Debit Cash/Bank, Credit Accounts
  Receivable.
- Cancelling an invoice → Reverse the original entry.
- Updating an invoice → Reverse original + create new entry.
- Recording an expense → Debit Expense Account, Credit
  Cash/Bank.
- Manual journal entries MUST enforce total debits = total
  credits before saving.
- Journal entries are IMMUTABLE once created — corrections are
  done via new reversal entries, never by editing existing
  entries.

**Rationale**: Financial integrity is non-negotiable.
Unbalanced or missing entries destroy trust in the system's
accounting accuracy.

### VII. Offline-First Architecture (NON-NEGOTIABLE)

Every feature MUST function without an internet connection.

- Use Firestore's built-in offline persistence as the
  foundation.
- All CRUD operations MUST write to local cache first, then
  sync when online.
- QR code generation, invoice creation, expense recording —
  all MUST work offline.
- A visible sync status indicator MUST be present at all times
  (synced / pending / error).
- Conflict resolution: last-write-wins with server timestamp,
  conflicts logged for admin review.

**Rationale**: Many property management offices in Saudi
Arabia have unreliable internet. The app MUST never block the
user's workflow due to connectivity issues.

### VIII. Feature-Based Authorization Enforcement (NON-NEGOTIABLE)

User permissions MUST be controlled via a granular
feature-toggle system.

- Every protected action MUST check the user's permission
  flags before execution — both on the client (hide/disable
  UI elements) AND on the server (Firestore security rules).
- Default user permissions: create invoice, change own
  password, add expenses — all other actions denied by
  default.
- Admin-only features (user management, company profile) MUST
  NEVER be delegatable.
- Permission checks MUST NOT be bypassed by offline mode —
  cached permissions are used offline.

**Rationale**: The admin trusts the system to enforce the
access boundaries they configured. Client-only permission
checks are insufficient.

### IX. Immutable Audit Trail (NON-NEGOTIABLE)

Every significant action MUST be logged with: acting user,
timestamp (UTC+3), action type, affected entity, before/after
state summary.

- Financial records (invoices, journal entries, credit notes)
  are NEVER deleted — only cancelled or reversed.
- User permission changes, account activations/deactivations,
  company profile updates — all logged.
- Audit logs are append-only and cannot be modified or deleted
  by any user, including admins.

**Rationale**: For regulatory compliance (ZATCA) and business
integrity, a complete, tamper-proof activity history is
essential.

### X. PWA & Installability Standards (NON-NEGOTIABLE)

The app MUST be a fully installable Progressive Web App.

- Service worker caching for app shell, static assets, and
  critical data.
- App manifest with proper Arabic app name, icons (192x192
  and 512x512), theme color, and `display: standalone`.
- The app MUST pass Lighthouse PWA audit with a score of 90+.
- No signup flow — landing page directs users to contact the
  company via floating WhatsApp button (+966543620486).

**Rationale**: The app is distributed directly to staff by
the company. It MUST feel like a native installed app, not a
website.

### XI. TypeScript Strict Mode & Code Quality (NON-NEGOTIABLE)

All code MUST be written in TypeScript with strict mode
enabled.

- `strict: true` in tsconfig.json — no exceptions.
- No `any` types unless explicitly justified with a comment
  explaining why.
- All Firebase operations MUST use typed interfaces/models —
  no untyped Firestore document access.
- ESLint and Prettier configured and enforced.

**Rationale**: TypeScript strict mode catches entire
categories of bugs at compile time. In a financial
application, type safety is a safety requirement.

### XII. Test Coverage for Business Logic (NON-NEGOTIABLE)

All business-critical logic MUST have automated tests.

- ZATCA TLV encoding and QR generation — unit tested with
  known reference data.
- Journal entry generation — unit tested for every financial
  action type.
- Permission checks — tested for every role/feature
  combination.
- Invoice lifecycle (create → update → cancel) — integration
  tested.
- Offline sync logic — tested with simulated offline/online
  transitions.
- Tests MUST be written BEFORE or alongside implementation
  (TDD encouraged).

**Rationale**: Financial and regulatory logic cannot be
"probably correct." Automated tests are the only reliable
verification.

## Compliance Gates

Each gate corresponds to one or more principles above.
Violation of any gate blocks the workflow until resolved.

| Gate ID | Trigger | Principle | Check |
|---------|---------|-----------|-------|
| G-01 | Any frontend task | Art. I | frontend-design skill consulted |
| G-02 | Any Firestore operation | Art. II | Firebase CLI used (no Console) |
| G-03 | Post-implementation | Art. III | `git status` clean, commits structured |
| G-04 | Any UI text/layout | Art. IV | RTL-first, Arabic default, logical CSS |
| G-05 | Any financial document | Art. V | ZATCA TLV QR, sequential numbering |
| G-06 | Any financial action | Art. VI | Balanced double-entry journal entry |
| G-07 | Any feature | Art. VII | Works offline, sync indicator present |
| G-08 | Any protected action | Art. VIII | Client + server permission check |
| G-09 | Any significant action | Art. IX | Audit log entry created |
| G-10 | Build/deploy | Art. X | PWA audit 90+, manifest valid |
| G-11 | Any code | Art. XI | TypeScript strict, no untyped access |
| G-12 | Business logic | Art. XII | Automated tests present and passing |

## Git Commit Discipline

After `/speckit.implement` completes successfully, the agent
MUST follow the commit template defined in Article III. The
`/speckit.analyze` command MUST validate that no uncommitted
implementation artifacts remain.

Commit message template:

```
feat(TASK_ID): SHORT_DESCRIPTION

- Implemented: BRIEF_LIST_OF_WHAT_WAS_DONE
- Spec: FEATURE_SPEC_REFERENCE
- Task: TASK_ID from tasks.md
```

## Governance

### Amendment Process

- Any article can be amended by providing explicit rationale,
  impact analysis on existing specs, and updating the
  constitution version.
- CONSTITUTION_VERSION follows semantic versioning:
  - **MAJOR**: Principle removals or redefinitions.
  - **MINOR**: New articles or materially expanded guidance.
  - **PATCH**: Clarifications, wording, non-semantic
    refinements.

### Compliance Review

- The `/speckit.analyze` command MUST validate all artifacts
  against this constitution before proceeding to
  implementation.
- Any CRITICAL violation blocks the workflow until resolved.
- All PRs and code reviews MUST verify compliance with the
  12 articles above.

**Version**: 1.0.0 | **Ratified**: 2026-02-08 | **Last Amended**: 2026-02-08
