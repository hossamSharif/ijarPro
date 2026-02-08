 
Use Next.js 14+ (App Router with TypeScript strict mode) deployed on Firebase Hosting. The entire backend is Firebase — no separate API server. Use Firestore as the database with offline persistence enabled, Firebase Authentication for user auth, and Firebase Storage for file uploads (logos, receipts). Use shadcn/ui component library with Tailwind CSS for the UI, with full RTL support via CSS logical properties and the dir="rtl" HTML attribute. The app is a PWA using next-pwa (or @ducanh2912/next-pwa) for service worker generation and offline caching.

## Technical Context

- **Language/Version**: TypeScript 5.x with strict mode (`"strict": true` in tsconfig.json)
- **Framework**: Next.js 14+ with App Router (`app/` directory), React 18+
- **Primary Dependencies**:
  - `firebase` (client SDK v10+) — Firestore, Auth, Storage
  - `firebase-admin` (for Firestore security rules testing and optional server-side operations in Next.js API routes if needed for initial admin seeding)
  - `shadcn/ui` — component library (install components individually via CLI)
  - `tailwindcss` with CSS logical properties (`ms-`, `me-`, `ps-`, `pe-` utilities) for RTL
  - `next-intl` — internationalization (Arabic/English with RTL/LTR switching)
  - `next-pwa` or `@ducanh2912/next-pwa` — PWA service worker and manifest generation
  - `qrcode` or `qrcode.react` — client-side QR code generation for ZATCA
  - `date-fns` or `dayjs` — date manipulation
  - `@psdos/hijri-date` or similar — Hijri (Umm al-Qura) calendar conversion
  - `zod` — runtime schema validation for forms and Firestore data
  - `react-hook-form` — form management with zod resolver
  - `lucide-react` — icon system (already included with shadcn/ui)
  - `jspdf` + `jspdf-autotable` or `@react-pdf/renderer` — PDF generation with Arabic/RTL support
  - `recharts` — dashboard charts and reporting visualizations
  - `sonner` — toast notifications (shadcn/ui compatible)
- **Storage**: Cloud Firestore (NoSQL document database) with offline persistence enabled via `enableIndexedDbPersistence()` or `initializeFirestore()` with `persistentLocalCache`
- **Authentication**: Firebase Authentication (email/password provider). Custom claims for role (admin/user). No social login, no self-signup.
- **File Storage**: Firebase Storage for company logos and expense receipt uploads
- **Testing**:
  - `vitest` — unit and integration testing
  - `@testing-library/react` — component testing
  - `firebase-tools` emulator suite — local Firestore, Auth, Storage emulators for integration testing
  - `playwright` or `cypress` — E2E testing (optional, for critical flows)
- **Target Platform**: Modern browsers (Chrome, Safari, Edge, Firefox — latest 2 versions), Android/iOS PWA
- **Deployment**: Firebase Hosting with web framework support (auto-detects Next.js, handles SSR/SSG)
- **Project Type**: Web application (single project — Next.js handles both frontend and any server-side logic via API routes or server components)

## Performance Goals

- Initial load interactive in < 3 seconds on 4G
- Firestore queries return in < 500ms for collections up to 2,000 documents
- Offline operations (create invoice, add expense) respond in < 200ms from local cache
- PWA Lighthouse score: 90+ across all categories
- Bundle size: < 300KB initial JS (code-split per route)

## Constraints

- Offline-capable: ALL features must work without internet after first load
- 10-20 concurrent users per instance (single company/tenant)
- 50 buildings, 2,000 apartments max per instance
- Saudi Arabia timezone (UTC+3) for all timestamps
- ZATCA Phase 1 compliance: QR code with TLV Base64 encoding entirely client-side
- Arabic-first RTL layout with English LTR toggle
- No separate backend API — direct client-to-Firebase SDK calls secured by Firestore Security Rules
- Firebase CLI must be used for ALL infrastructure operations (rules, indexes, emulators, deployment) — never the Firebase Console

## Source Structure

Use a single Next.js project (no monorepo) with this directory layout:

```
ijar-pro/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth group (login page)
│   │   └── login/
│   ├── (dashboard)/              # Protected app group
│   │   ├── layout.tsx            # Sidebar + topbar layout with RTL support
│   │   ├── page.tsx              # Dashboard home
│   │   ├── buildings/
│   │   ├── apartments/
│   │   ├── customers/
│   │   ├── invoices/
│   │   │   ├── page.tsx          # Invoice list
│   │   │   ├── new/
│   │   │   └── [id]/
│   │   ├── expenses/
│   │   ├── journal/
│   │   ├── reports/
│   │   ├── settings/
│   │   │   ├── company/          # Company profile (admin only)
│   │   │   └── users/            # User management (admin only)
│   │   └── profile/              # User's own profile (change password)
│   ├── layout.tsx                # Root layout (RTL dir, fonts, providers)
│   ├── page.tsx                  # Landing page (public, no auth)
│   └── manifest.ts               # PWA manifest
├── components/
│   ├── ui/                       # shadcn/ui components
│   ├── layout/                   # Sidebar, Topbar, FAB, SyncIndicator
│   ├── invoices/                 # Invoice-specific components
│   ├── accounting/               # Journal, Chart of Accounts components
│   └── shared/                   # Bilingual inputs, date pickers, etc.
├── lib/
│   ├── firebase/
│   │   ├── config.ts             # Firebase app initialization with offline persistence
│   │   ├── auth.ts               # Auth helpers, custom claims check
│   │   ├── firestore.ts          # Typed Firestore helpers (collections, converters)
│   │   └── storage.ts            # Storage upload/download helpers
│   ├── zatca/
│   │   ├── tlv-encoder.ts        # ZATCA TLV Tag-Length-Value encoding
│   │   ├── qr-generator.ts       # QR code generation from TLV data
│   │   └── invoice-validator.ts  # ZATCA field validation
│   ├── accounting/
│   │   ├── journal-engine.ts     # Auto journal entry generation logic
│   │   ├── chart-of-accounts.ts  # Predefined CoA with Saudi conventions
│   │   └── balance-validator.ts  # Debit/credit balance enforcement
│   ├── i18n/
│   │   ├── config.ts             # next-intl configuration
│   │   ├── ar.json               # Arabic translations
│   │   └── en.json               # English translations
│   ├── permissions/
│   │   ├── feature-flags.ts      # Permission definitions and defaults
│   │   └── guard.tsx             # Permission-checking HOC/hook
│   ├── sync/
│   │   ├── sync-manager.ts       # Offline sync status tracking
│   │   ├── conflict-resolver.ts  # Last-write-wins with logging
│   │   └── invoice-sequence.ts   # Offline sequential numbering with temp prefix
│   ├── hooks/                    # Custom React hooks
│   ├── utils/
│   │   ├── dates.ts              # Hijri/Gregorian conversion, formatting
│   │   ├── numbers.ts            # Arabic-Indic numeral formatting
│   │   └── currency.ts           # SAR formatting
│   └── types/                    # Shared TypeScript interfaces
│       ├── models.ts             # All entity type definitions
│       ├── permissions.ts        # Permission enum/types
│       └── accounting.ts         # Journal entry types, account types
├── hooks/                        # App-level hooks
├── public/
│   ├── icons/                    # PWA icons (192x192, 512x512)
│   └── fonts/                    # Arabic web fonts
├── firebase/
│   ├── firestore.rules           # Firestore Security Rules (role + permission enforcement)
│   ├── firestore.indexes.json    # Composite indexes for queries
│   └── storage.rules             # Storage Security Rules
├── scripts/
│   └── seed-admin.ts             # Script to create initial admin account via Firebase Admin SDK
├── firebase.json                 # Firebase project configuration
├── .firebaserc                   # Firebase project aliases
├── next.config.js                # Next.js config with PWA plugin
├── tailwind.config.ts            # Tailwind config with RTL plugin
├── tsconfig.json                 # TypeScript strict mode
└── vitest.config.ts              # Test configuration
```

## Implementation Approach

### Authentication & Authorization Architecture

- Firebase Auth with email/password provider only. No social, no self-signup.
- On admin account creation (initial deployment), set custom claims: `{ role: "admin" }`.
- For regular users created by admin, set custom claims: `{ role: "user" }`.
- User feature permissions stored in Firestore `users/{uid}/permissions` document as a map of feature flags (`{ canCancelInvoice: true, canViewJournal: false, ... }`).
- Client-side: `usePermission()` hook reads cached permissions and conditionally renders UI.
- Server-side: Firestore Security Rules read the user's permission document to enforce access on every read/write operation.
- Offline: Permissions are cached with the Firestore offline cache — user operates with last-synced permissions.

### Firestore Data Architecture

- **Top-level collections**: `company`, `users`, `buildings`, `apartments`, `customers`, `invoices`, `creditNotes`, `expenses`, `journalEntries`, `accounts`, `auditLog`.
- **No nested subcollections for core entities** — keeps queries flat and offline-sync friendly.
- Each document includes: `createdAt`, `createdBy`, `updatedAt`, `updatedBy` metadata fields.
- Invoice documents include a `zatcaQrData` field storing the raw TLV-encoded Base64 string for QR regeneration.
- Apartment `status` field is denormalized for fast occupancy queries (updated atomically when lease linked/unlinked).
- Sequential invoice numbers managed via a `counters/invoices` document using Firestore transactions (online) or temporary device-prefixed IDs (offline, resolved on sync).

### ZATCA QR Code Implementation

- Pure client-side implementation in `lib/zatca/tlv-encoder.ts`:
  1. Build TLV buffer: Tag 1 (seller name), Tag 2 (VAT number), Tag 3 (timestamp ISO 8601), Tag 4 (total with VAT), Tag 5 (VAT amount).
  2. Concatenate all TLV byte arrays.
  3. Base64-encode the concatenated buffer.
  4. Generate QR code from the Base64 string using `qrcode.react`.
- Works entirely offline — no server dependency.
- Credit notes get their own QR codes with their own TLV data.

### Double-Entry Accounting Engine

- `lib/accounting/journal-engine.ts` exposes pure functions:
  - `createInvoiceEntry(invoice)` → JournalEntry
  - `createPaymentEntry(invoice, amount)` → JournalEntry
  - `createCancellationEntry(invoice)` → JournalEntry (reversal)
  - `createExpenseEntry(expense)` → JournalEntry
- All functions return typed `JournalEntry` objects validated by `balance-validator.ts` (total debits === total credits) BEFORE writing to Firestore.
- Predefined Chart of Accounts in `chart-of-accounts.ts` following Saudi conventions (numbered: 1xxx Assets, 2xxx Liabilities, 3xxx Equity, 4xxx Revenue, 5xxx Expenses).
- Journal entries are immutable in Firestore Security Rules — once created, no update or delete allowed.

### Offline Mode & Sync Strategy

- Firestore SDK initialized with `persistentLocalCache` and `persistentMultipleTabManager` for multi-tab offline support.
- All writes go to local cache first (Firestore SDK handles this automatically).
- `lib/sync/sync-manager.ts` monitors `onSnapshotsInSync` to track pending writes and update the UI sync indicator.
- `lib/sync/invoice-sequence.ts`: Offline invoices get temporary IDs like `OFFLINE-{deviceId}-{localSeq}`. On sync, a Cloud Function or client-side transaction assigns the final sequential number from the `counters/invoices` document.
- `lib/sync/conflict-resolver.ts`: Firestore's built-in last-write-wins handles conflicts. Additionally, a listener detects when local pending writes are overwritten by server data and logs these to the `auditLog` collection for admin review.

### PWA Configuration

- `next-pwa` or `@ducanh2912/next-pwa` configured in `next.config.js`:
  - Precache: app shell, fonts, icons, locale files.
  - Runtime cache: Firestore REST fallback (for when SDK offline cache expires).
  - Custom cache strategies per route.
- `app/manifest.ts` generates the web manifest:
  - `name`: "إيجار برو" / "Ijar Pro"
  - `short_name`: "إيجار برو"
  - `dir`: "rtl"
  - `lang`: "ar"
  - `display`: "standalone"
  - `theme_color`: brand primary color
  - Icons at 192x192 and 512x512.

### RTL & Internationalization

- `next-intl` with locale routing: `/ar/*` (default) and `/en/*`.
- Root `<html>` tag sets `dir="rtl"` and `lang="ar"` by default, toggled on language switch.
- Tailwind CSS configured with logical properties. All component styling uses `ms-` (margin-inline-start), `me-` (margin-inline-end), `ps-`, `pe-` instead of `ml-`, `mr-`, `pl-`, `pr-`.
- shadcn/ui components are RTL-compatible (they use Radix primitives which support RTL).
- Arabic web fonts loaded: primary (e.g., IBM Plex Arabic or Cairo) + fallback. Latin companion font for English mode.
- Number formatting utility switches between Arabic-Indic (٠١٢٣٤٥٦٧٨٩) and Western digits based on active locale.
- Date formatting displays dual Hijri + Gregorian using Umm al-Qura calendar via `@psdos/hijri-date` or `Intl.DateTimeFormat` with `islamic-umalqura` calendar.
- Currency formatted as "ر.س" in Arabic, "SAR" in English.

### Firestore Security Rules Architecture

- Rules defined in `firebase/firestore.rules`, deployed via `firebase deploy --only firestore:rules`.
- Structure:
  - Admin check: `request.auth.token.role == "admin"`
  - User permission check: Read from `users/{uid}` document's permission map.
  - Company profile: admin-only read/write.
  - Users collection: admin-only for CRUD (except user can update own password via Firebase Auth SDK, and read own document).
  - Financial records (invoices, journalEntries, creditNotes): allow create, deny update/delete (immutability).
  - Audit log: allow create only, deny update/delete.
- Composite indexes defined in `firebase/firestore.indexes.json` for:
  - Invoices: `(status, createdAt)`, `(customerId, createdAt)`, `(apartmentId, createdAt)`
  - Journal entries: `(entryType, date)`, `(accountId, date)`
  - Expenses: `(category, date)`, `(buildingId, date)`
  - Apartments: `(buildingId, status)`

### PDF Generation

- Use `jspdf` with Arabic font embedding for invoice PDF export.
- Or `@react-pdf/renderer` for React-based PDF composition with RTL support.
- PDF includes: company logo (fetched from Firebase Storage and cached), all invoice fields, ZATCA QR code rendered as image, dual-language labels.
- Generated entirely client-side (works offline if logo is cached).

### Landing Page

- Public route at `app/page.tsx` (no auth required).
- Uses the frontend-design skill for a distinctive, professional design.
- Floating WhatsApp FAB linking to `https://wa.me/966543620486`.
- Language toggle (Arabic/English) in the header.
- "Login" button navigates to `/(auth)/login`. No signup anywhere.
- Responsive, mobile-first, Arabic RTL by default.

### Firebase CLI Operations (Constitution Article II Compliance)

All infrastructure operations MUST use Firebase CLI:
- `firebase init firestore` — initial setup
- `firebase emulators:start` — local development
- `firebase deploy --only firestore:rules` — rules deployment
- `firebase deploy --only firestore:indexes` — index deployment
- `firebase deploy --only hosting` — app deployment
- `firebase deploy` — full deployment
- Security rules, indexes, and firebase.json are version-controlled in the `firebase/` directory.

### Git Commit Strategy (Constitution Article III Compliance)

After `/speckit.implement` completes each task successfully:
- Stage all changed files: `git add .`
- Commit with: `feat(TASK_ID): SHORT_DESCRIPTION` format
- One commit per completed task
- No uncommitted work after successful implementation

## Constitution Check

Validate against all 12 constitutional articles:
- Article I (Frontend Design): All UI work must use the frontend-design skill — plan all pages/components to be designed with bold, intentional aesthetics, premium Arabic fonts, cohesive color theme.
- Article II (Firebase CLI): All Firestore operations via CLI — plan.md specifies firebase/ directory with rules, indexes, firebase.json all version-controlled.
- Article III (Git Commits): Implementation tasks will produce one commit per task with structured messages.
- Article IV (Arabic-First RTL): CSS logical properties, next-intl, RTL-first layout in every component.
- Article V (ZATCA Compliance): Client-side TLV encoding, QR generation, credit notes, sequential numbering, UTC+3 timestamps.
- Article VI (Double-Entry Accounting): Pure function journal engine, balance validation, immutable entries.
- Article VII (Offline-First): Firestore offline persistence, client-side QR, local-first writes, sync indicator.
- Article VIII (Feature Authorization): Custom claims + Firestore permission docs + Security Rules + client-side guards.
- Article IX (Audit Trail): Append-only auditLog collection, immutable financial records via Security Rules.
- Article X (PWA): next-pwa, manifest with Arabic metadata, standalone display, Lighthouse 90+.
- Article XI (TypeScript Strict): strict: true, typed Firestore converters, no any types.
- Article XII (Test Coverage): vitest for business logic (ZATCA, accounting, permissions), Firebase Emulator for integration tests.
```