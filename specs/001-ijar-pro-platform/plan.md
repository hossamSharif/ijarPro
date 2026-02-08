# Implementation Plan: Ijar Pro — Multi-Building Apartment Rental Management Platform

**Branch**: `001-ijar-pro-platform` | **Date**: 2026-02-08 | **Spec**: `specs/001-ijar-pro-platform/spec.md`
**Input**: Feature specification from `/specs/001-ijar-pro-platform/spec.md`

## Summary

Ijar Pro is an Arabic-first, offline-capable multi-building apartment rental management platform targeting property management companies in Saudi Arabia. It uses Next.js 14+ (App Router, TypeScript strict) deployed on Firebase Hosting, with Firestore (offline persistence), Firebase Auth (custom claims RBAC), and Firebase Storage. Key capabilities: ZATCA Phase 1 compliant invoicing with client-side TLV QR codes, double-entry accounting engine, bilingual Arabic/English UI with full RTL support, PWA installability, and granular feature-based permissions. The platform serves 10-20 concurrent users per single-company instance managing up to 50 buildings and 2,000 apartments.

## Technical Context

**Language/Version**: TypeScript 5.x with strict mode (`"strict": true` in tsconfig.json)
**Framework**: Next.js 14+ with App Router (`app/` directory), React 18+
**Primary Dependencies**:
  - `firebase` (client SDK v10+) — Firestore, Auth, Storage
  - `firebase-admin` — admin seeding script, optional server-side operations
  - `shadcn/ui` (with `--rtl` flag) — component library with automatic RTL conversion
  - `tailwindcss` v3.3+ with native CSS logical properties (`ms-`, `me-`, `ps-`, `pe-`)
  - `next-intl` — i18n (Arabic/English with RTL/LTR switching, `localePrefix: 'as-needed'`)
  - `@serwist/next` — PWA service worker and offline caching (successor to next-pwa)
  - `qrcode` + `qrcode.react` — client-side ZATCA QR code generation
  - `dayjs` + `dayjs-hijri` — date manipulation with Hijri calendar support
  - `zod` — runtime schema validation for forms and Firestore data
  - `react-hook-form` + `@hookform/resolvers` — form management with zod resolver
  - `lucide-react` — icon system (included with shadcn/ui)
  - `jspdf` + `jspdf-autotable` — PDF generation with Arabic font embedding
  - `recharts` — dashboard charts and reporting visualizations
  - `sonner` — toast notifications (shadcn/ui compatible)
**Storage**: Cloud Firestore with `persistentLocalCache({ tabManager: persistentMultipleTabManager() })`
**Authentication**: Firebase Auth (email/password). Custom claims `{ role: "admin" | "user" }`. Granular feature permissions in Firestore `users/{uid}.permissions` map.
**File Storage**: Firebase Storage for company logos and expense receipt uploads
**Testing**:
  - `vitest` — unit and integration testing
  - `@testing-library/react` — component testing
  - `firebase-tools` emulator suite — local Firestore, Auth, Storage emulators
**Target Platform**: Modern browsers (Chrome, Safari, Edge, Firefox — latest 2 versions), Android/iOS PWA
**Deployment**: Firebase Hosting with web framework auto-detection (Next.js SSR/SSG)
**Project Type**: Web application (single Next.js project — no monorepo)

**Performance Goals**:
- Initial load interactive in < 3 seconds on 4G
- Firestore queries return in < 500ms for collections up to 2,000 documents
- Offline operations respond in < 200ms from local cache
- PWA Lighthouse score: 100% (pass/fail criteria)
- Bundle size: < 300KB initial JS (code-split per route)

**Constraints**:
- Offline-capable: ALL features must work without internet after first load
- 10-20 concurrent users per instance (single company/tenant)
- 50 buildings, 2,000 apartments max per instance
- Saudi Arabia timezone (UTC+3) for all timestamps
- ZATCA Phase 1 compliance: client-side TLV Base64 QR encoding
- Arabic-first RTL layout with English LTR toggle
- No separate backend API — direct client-to-Firebase SDK calls
- Firebase CLI for ALL infrastructure operations (never Firebase Console)
- 500 pending offline writes limit (Firestore SDK constraint)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Article | Principle | Status | Compliance Strategy |
|---------|-----------|--------|-------------------|
| I | Frontend Design Excellence | PASS | All UI tasks use `frontend-design` skill. Cairo font, cohesive color theme via CSS variables, RTL-first micro-interactions. |
| II | Firebase CLI-First | PASS | All rules, indexes, and deployment via Firebase CLI. `firebase/` directory version-controlled. Emulators for dev. |
| III | Git Commit Discipline | PASS | One commit per task: `feat(TASK_ID): SHORT_DESCRIPTION`. No uncommitted work after implementation. |
| IV | Arabic-First RTL | PASS | Tailwind logical properties, next-intl with `defaultLocale: 'ar'`, `dir="rtl"` on `<html>`, Cairo font, Arabic-Indic numerals, Hijri dates. |
| V | ZATCA Compliance | PASS | Custom TLV encoder (Tags 1-5), client-side QR via `qrcode`, sequential numbering, credit notes, UTC+3, immutable invoices. |
| VI | Double-Entry Accounting | PASS | Pure function journal engine, balance validation before write, immutable entries via Security Rules. Predefined Saudi CoA. |
| VII | Offline-First | PASS | `persistentLocalCache` with `persistentMultipleTabManager`, client-side QR, local-first writes, sync indicator via snapshot metadata. Temporary offline invoice IDs. |
| VIII | Feature Authorization | PASS | Custom claims (`role`) + Firestore permissions map. Security Rules check both. Client-side `usePermission()` hook. Offline: cached permissions. |
| IX | Immutable Audit Trail | PASS | Append-only `auditLog` collection. Financial records immutable via Security Rules (create only, no update/delete). |
| X | PWA Standards | PASS | `@serwist/next` for service worker. Native `app/manifest.ts`. Arabic metadata. Precache app shell + icons. Lighthouse 100% PWA. |
| XI | TypeScript Strict | PASS | `strict: true`, typed Firestore converters, Zod schemas for runtime validation. No `any` types. |
| XII | Test Coverage | PASS | vitest for ZATCA TLV, journal engine, permissions, balance validator. Firebase Emulator for integration tests. |

**Post-Phase 1 Re-check**: All 12 articles satisfied. No violations. No complexity justifications needed.

## Project Structure

### Documentation (this feature)

```text
specs/001-ijar-pro-platform/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0: Technology research & decisions
├── data-model.md        # Phase 1: Firestore data model
├── quickstart.md        # Phase 1: Project setup guide
├── contracts/
│   ├── firestore-operations.md   # Phase 1: All CRUD operation contracts
│   ├── security-rules.md        # Phase 1: Security rules architecture
│   └── typescript-interfaces.md # Phase 1: Type definitions
└── tasks.md             # Phase 2: Implementation tasks (via /speckit.tasks)
```

### Source Code (repository root)

```text
ijar-pro/
├── app/
│   ├── [locale]/                     # Locale-based routing (ar default, en)
│   │   ├── (auth)/                   # Auth group
│   │   │   └── login/
│   │   │       └── page.tsx
│   │   ├── (dashboard)/              # Protected app group
│   │   │   ├── layout.tsx            # Sidebar + topbar layout with RTL
│   │   │   ├── page.tsx              # Dashboard home
│   │   │   ├── buildings/
│   │   │   │   ├── page.tsx          # Building list
│   │   │   │   ├── new/
│   │   │   │   └── [id]/
│   │   │   ├── apartments/
│   │   │   │   └── [id]/
│   │   │   ├── customers/
│   │   │   │   ├── page.tsx          # Customer list
│   │   │   │   ├── new/
│   │   │   │   └── [id]/
│   │   │   ├── invoices/
│   │   │   │   ├── page.tsx          # Invoice list
│   │   │   │   ├── new/
│   │   │   │   └── [id]/
│   │   │   ├── expenses/
│   │   │   │   ├── page.tsx          # Expense list
│   │   │   │   └── new/
│   │   │   ├── journal/
│   │   │   │   ├── page.tsx          # Journal entries
│   │   │   │   └── new/              # Manual entry
│   │   │   ├── reports/
│   │   │   │   └── page.tsx          # Reports dashboard
│   │   │   ├── settings/
│   │   │   │   ├── company/          # Company profile (admin only)
│   │   │   │   └── users/            # User management (admin only)
│   │   │   └── profile/              # Own profile (change password)
│   │   ├── layout.tsx                # Locale layout (dir, lang, fonts, providers)
│   │   └── page.tsx                  # Landing page (public, no auth)
│   ├── manifest.ts                   # PWA manifest
│   ├── sw.ts                         # Service worker source (Serwist)
│   └── layout.tsx                    # Root layout (minimal)
├── components/
│   ├── ui/                           # shadcn/ui components (RTL-aware)
│   ├── layout/
│   │   ├── sidebar.tsx               # Navigation sidebar
│   │   ├── topbar.tsx                # Top navigation bar
│   │   ├── sync-indicator.tsx        # Online/offline sync status
│   │   └── whatsapp-fab.tsx          # Floating WhatsApp button
│   ├── invoices/
│   │   ├── invoice-form.tsx          # Create/edit invoice form
│   │   ├── invoice-card.tsx          # Invoice summary card
│   │   ├── invoice-pdf.tsx           # PDF generation component
│   │   └── zatca-qr.tsx             # QR code display component
│   ├── accounting/
│   │   ├── journal-entry-form.tsx    # Manual journal entry form
│   │   ├── chart-of-accounts.tsx     # CoA tree view
│   │   └── balance-indicator.tsx     # Debit/credit balance display
│   └── shared/
│       ├── bilingual-input.tsx       # Dual Arabic/English input field
│       ├── hijri-date-picker.tsx     # Hijri/Gregorian date picker
│       ├── permission-guard.tsx      # Permission-based rendering
│       └── data-table.tsx            # Reusable data table with RTL
├── lib/
│   ├── firebase/
│   │   ├── config.ts                 # Firebase init with offline persistence
│   │   ├── auth.ts                   # Auth helpers, custom claims
│   │   ├── firestore.ts             # Typed converters, collection refs
│   │   └── storage.ts               # File upload/download helpers
│   ├── zatca/
│   │   ├── tlv-encoder.ts           # TLV Tag-Length-Value encoding
│   │   ├── qr-generator.ts          # QR code generation from TLV
│   │   └── invoice-validator.ts     # ZATCA field validation
│   ├── accounting/
│   │   ├── journal-engine.ts        # Auto journal entry generation
│   │   ├── chart-of-accounts.ts     # Predefined Saudi CoA
│   │   └── balance-validator.ts     # Debit/credit balance check
│   ├── i18n/
│   │   ├── routing.ts               # next-intl routing config
│   │   ├── request.ts               # next-intl request config
│   │   └── messages/
│   │       ├── ar.json              # Arabic translations
│   │       └── en.json              # English translations
│   ├── permissions/
│   │   ├── feature-flags.ts         # Permission definitions & defaults
│   │   └── guard.tsx                # usePermission hook + component
│   ├── sync/
│   │   ├── sync-manager.ts          # Offline sync status tracking
│   │   ├── conflict-resolver.ts     # LWW with audit logging
│   │   └── invoice-sequence.ts      # Offline numbering with temp prefix
│   ├── hooks/
│   │   ├── use-auth.ts              # Authentication state hook
│   │   ├── use-firestore.ts         # Typed Firestore query hooks
│   │   └── use-sync-status.ts       # Sync indicator hook
│   ├── utils/
│   │   ├── dates.ts                 # Hijri/Gregorian, formatting
│   │   ├── numbers.ts              # Arabic-Indic numeral formatting
│   │   └── currency.ts             # SAR formatting
│   ├── validators/                  # Zod schemas per entity
│   │   ├── company.ts
│   │   ├── user.ts
│   │   ├── building.ts
│   │   ├── apartment.ts
│   │   ├── customer.ts
│   │   ├── invoice.ts
│   │   ├── expense.ts
│   │   └── journal-entry.ts
│   └── types/
│       ├── models.ts                # All entity type definitions
│       ├── permissions.ts           # Permission enum/types
│       └── accounting.ts            # Journal entry types, account types
├── public/
│   ├── icons/                       # PWA icons (192x192, 512x512)
│   ├── fonts/                       # Amiri font for PDF generation
│   └── firebase-messaging-sw.js     # FCM service worker (push notifications)
├── firebase/
│   ├── firestore.rules              # Firestore Security Rules
│   ├── firestore.indexes.json       # Composite indexes
│   └── storage.rules                # Storage Security Rules
├── scripts/
│   └── seed-admin.ts                # Initial admin account seeding
├── __tests__/
│   ├── unit/
│   │   ├── zatca/                   # TLV encoder, QR generator tests
│   │   ├── accounting/              # Journal engine, balance validator tests
│   │   └── permissions/             # Permission guard tests
│   └── integration/
│       ├── invoices/                # Invoice lifecycle tests (emulator)
│       └── sync/                    # Offline sync tests
├── firebase.json
├── .firebaserc
├── next.config.js                   # Next.js + Serwist + next-intl
├── tailwind.config.ts
├── tsconfig.json                    # strict: true
├── vitest.config.ts
└── middleware.ts                     # next-intl middleware
```

**Structure Decision**: Single Next.js project with App Router, no monorepo. The `[locale]` dynamic segment at the top of the route tree handles i18n routing. Route groups `(auth)` and `(dashboard)` organize public vs protected pages. All Firebase infrastructure files in `firebase/` directory are version-controlled.

## Implementation Approach

### Authentication & Authorization Architecture

- Firebase Auth with email/password provider only. No social, no self-signup.
- Initial admin: seeded via `scripts/seed-admin.ts` using Firebase Admin SDK. Sets custom claims `{ role: "admin" }`.
- Regular users: created by admin through the app. Custom claims set via Cloud Function trigger or Next.js API route calling Admin SDK.
- **Hybrid RBAC**: Core role in custom claims (fast, free, offline-safe), granular permissions in Firestore `users/{uid}.permissions` map.
- **Client-side**: `usePermission(key)` hook reads cached user document and returns boolean. Components use `<PermissionGuard permission="canCancelInvoice">` for conditional rendering.
- **Server-side**: Security Rules check `request.auth.token.role` first (free), then `get()` permissions document only when needed (costs 1 read).
- **Token refresh**: Firestore snapshot listener on user document detects permission changes → calls `getIdToken(true)`.
- **Deactivation**: Disable Firebase Auth account + set `isActive: false` in Firestore + optional token revocation.

### Firestore Data Architecture

- **11 top-level collections**: `company`, `users`, `buildings`, `apartments`, `customers`, `invoices`, `expenses`, `journalEntries`, `accounts`, `counters`, `auditLog`.
- **No nested subcollections** — flat structure for offline-sync compatibility and simpler Security Rules.
- **Denormalization**: Building occupancy counts, customer/building names on invoices, account names on journal lines.
- **Offline persistence**: `initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) })` in client-only singleton module.
- **Sequential numbering**: Online → Firestore transaction on `counters/invoices`. Offline → temporary `OFFLINE-{deviceId}-{seq}` prefix, resolved on sync.

### ZATCA QR Code Implementation

- Custom TLV encoder in `lib/zatca/tlv-encoder.ts`:
  1. Convert each field value to UTF-8 via `TextEncoder`
  2. Build `[Tag:1byte][ByteLength:1byte][UTF8Value]` for each of 5 tags
  3. Concatenate all TLV buffers
  4. Base64-encode the result
  5. Generate QR code from Base64 string using `qrcode.react` (display) or `qrcode` (PDF embed via canvas)
- All amounts: 2 decimal places, period separator, Western Arabic numerals
- Timestamps: ISO 8601 with UTC+3 offset
- Works entirely offline — no server dependency
- Unit tested against known reference Base64 strings

### Double-Entry Accounting Engine

- `lib/accounting/journal-engine.ts` — pure functions:
  - `createInvoiceEntry(invoice, company)` → JournalEntry (DR: AR, CR: Revenue + VAT Payable)
  - `createPaymentEntry(invoice, amount)` → JournalEntry (DR: Cash/Bank, CR: AR)
  - `createCancellationEntry(invoice)` → JournalEntry (reversal)
  - `createExpenseEntry(expense)` → JournalEntry (DR: Expense category, CR: Cash/Bank)
- `lib/accounting/balance-validator.ts` — validates `totalDebits === totalCredits` before every write
- Predefined Chart of Accounts in `chart-of-accounts.ts`: 1xxx Assets, 2xxx Liabilities, 3xxx Equity, 4xxx Revenue, 5xxx Expenses
- Journal entries are **immutable** — Security Rules allow create only, deny update/delete

### Offline Mode & Sync Strategy

- Firestore SDK handles local-first writes automatically — all operations write to IndexedDB cache first
- `lib/sync/sync-manager.ts`: monitors `snapshot.metadata.hasPendingWrites` and `fromCache` with `includeMetadataChanges: true`
- Sync indicator states: Synced (green), Syncing (amber), Offline (yellow), Pending Changes (orange), Error (red)
- `lib/sync/invoice-sequence.ts`: generates `OFFLINE-{deviceId}-{localSeq}` IDs offline, resolves to final sequential number on reconnect
- Conflict resolution: Firestore LWW with server timestamp. Conflicts logged to `auditLog` with `syncConflict: true`
- **Constraint**: Max 500 pending offline writes (Firestore SDK limit)

### PWA Configuration

- `@serwist/next` in `next.config.js` with `swSrc: "app/sw.ts"` and `swDest: "public/sw.js"`
- Precache: app shell chunks, PWA icons, default locale file (Arabic)
- Runtime caching: Auth routes → NetworkOnly, API → NetworkFirst, Assets → CacheFirst, Default → StaleWhileRevalidate
- `app/manifest.ts`: `{ name: "إيجار برو", short_name: "إيجار برو", dir: "rtl", lang: "ar", display: "standalone" }`
- Offline fallback route at `app/[locale]/~offline/page.tsx`
- FCM push notifications via separate `firebase-messaging-sw.js`

### RTL & Internationalization

- `next-intl` with routing config: `{ locales: ['ar', 'en'], defaultLocale: 'ar', localePrefix: 'as-needed' }`
- Arabic routes: no prefix (`/buildings`). English routes: `/en/buildings`
- `<html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>` in locale layout
- Tailwind logical properties throughout — **zero** physical directional properties
- Cairo font (Arabic primary) + Geist Sans (Latin) via `next/font`
- `Intl.DateTimeFormat` with `islamic-umalqura` for Hijri display, `dayjs-hijri` for manipulation
- `Intl.NumberFormat` with `-u-nu-arab` (Arabic mode) / `-u-nu-latn` (English mode)
- shadcn/ui `--rtl` mode: automatic positioning, spacing, icon flipping, animation direction

### PDF Generation

- jsPDF + jspdf-autotable with Amiri TTF font embedding
- Lazy-loaded via `next/dynamic` with `ssr: false`
- QR code: render to canvas → `toDataURL('image/png')` → `doc.addImage()`
- Company logo: cached from Firebase Storage as base64
- Fallback: pdfmake + @digicole/pdfmake-rtl if Arabic RTL handling proves insufficient
- Works entirely offline if logo is cached

### Firestore Security Rules Architecture

- Rules in `firebase/firestore.rules`, deployed via `firebase deploy --only firestore:rules`
- Helper functions: `isAdmin()` (claims-based, free), `hasPermission(perm)` (Firestore get, costs 1 read)
- Financial immutability: invoices/journalEntries/creditNotes allow create, deny update/delete
- Audit log: append-only, no update/delete by anyone including admins
- Composite indexes in `firebase/firestore.indexes.json` for all filtered queries
- Performance: short-circuit with `isAuthenticated()` and `isAdmin()` before `get()` calls

### Landing Page

- Public route at `app/[locale]/page.tsx` (no auth required)
- Uses the **frontend-design skill** for distinctive, professional design
- Floating WhatsApp FAB → `https://wa.me/966543620486`
- Language toggle (Arabic/English) in header
- "Login" button → `/(auth)/login`. No signup anywhere
- Responsive, mobile-first, Arabic RTL by default

### Firebase CLI Operations (Constitution Article II)

All infrastructure operations use Firebase CLI:
- `firebase init` — project setup
- `firebase emulators:start` — local development
- `firebase deploy --only firestore:rules` — rules
- `firebase deploy --only firestore:indexes` — indexes
- `firebase deploy --only hosting` — app
- Security rules, indexes, and firebase.json are version-controlled in `firebase/`

### Git Commit Strategy (Constitution Article III)

After `/speckit.implement` completes each task:
- Stage changed files: `git add <specific files>`
- Commit: `feat(TASK_ID): SHORT_DESCRIPTION`
- One commit per completed task
- No uncommitted work after successful implementation

## Complexity Tracking

> No violations to justify. All 12 constitutional articles are satisfied with the chosen architecture.

| Aspect | Decision | Justification |
|--------|----------|---------------|
| Single project (no monorepo) | Next.js handles frontend + any server logic | Simpler deployment, single Firebase Hosting target |
| Flat Firestore collections (no subcollections) | All 11 collections at top level | Required for offline sync compatibility, simpler Security Rules |
| Hybrid RBAC (claims + Firestore) | Role in claims, permissions in Firestore | Claims for fast/free checks, Firestore for dynamic granular permissions |
| Client-side PDF generation | jsPDF in browser | Offline requirement mandates client-side; no server dependency |
| Temporary offline invoice IDs | `OFFLINE-{deviceId}-{seq}` prefix | Firestore transactions fail offline; resolved on reconnect |
