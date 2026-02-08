# Tasks: Ijar Pro — Multi-Building Apartment Rental Management Platform

**Input**: Design documents from `/specs/001-ijar-pro-platform/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Not explicitly requested in the feature specification. Test tasks are omitted. Tests can be added later via a separate pass.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, dependency installation, and base configuration

- [x] T001 Create Next.js project with TypeScript, Tailwind, ESLint, App Router via `npx create-next-app@latest` in repository root
- [x] T002 Install core dependencies: firebase, firebase-admin, next-intl, zod, react-hook-form, @hookform/resolvers, qrcode, qrcode.react, dayjs, dayjs-hijri, jspdf, jspdf-autotable, @serwist/next, sonner, recharts per quickstart.md
- [x] T003 Install dev dependencies: vitest, @testing-library/react, @testing-library/jest-dom, jsdom, @types/qrcode, @types/jspdf, @serwist/precaching, @serwist/sw
- [x] T004 Initialize shadcn/ui with RTL flag (`npx shadcn@latest init --rtl`) and install components: button, input, label, card, dialog, table, form, select, textarea, toast, tabs, badge, separator, dropdown-menu, sheet, sidebar
- [x] T005 Configure TypeScript strict mode in tsconfig.json (`"strict": true`)
- [x] T006 [P] Configure Tailwind in tailwind.config.ts with Cairo font family and CSS logical properties convention
- [x] T007 [P] Configure next.config.js with @serwist/next PWA plugin and next-intl plugin
- [x] T008 [P] Create environment variables template .env.local.example with all NEXT_PUBLIC_FIREBASE_* keys
- [x] T009 Initialize Firebase project: `firebase init` with Firestore, Hosting (web framework), Storage, Emulators (Auth, Firestore, Storage)
- [x] T010 [P] Create firebase.json with hosting config, emulator ports, and paths to firebase/ directory
- [x] T011 [P] Create .firebaserc with project alias
- [x] T012 [P] Create vitest.config.ts with jsdom environment and path aliases

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**CRITICAL**: No user story work can begin until this phase is complete

### Type System & Validation

- [x] T013 [P] Create TypeScript interfaces for all entities in lib/types/models.ts per typescript-interfaces.md (BaseDocument, BilingualName, Address, Company, User, UserPermissions, Building, Apartment, Customer, Invoice, LineItem, StatusChange, Expense, Counter, AuditLogEntry)
- [x] T014 [P] Create accounting types in lib/types/accounting.ts (AccountType, JournalEntryType, Account, JournalLine, JournalEntry)
- [x] T015 [P] Create permission types in lib/types/permissions.ts (PermissionKey, DEFAULT_USER_PERMISSIONS, ADMIN_ONLY_FEATURES, UserRole)
- [x] T016 [P] Create ZATCA types in lib/types/zatca.ts (ZatcaTlvData)
- [x] T017 [P] Create Zod validation schema for company in lib/validators/company.ts
- [x] T018 [P] Create Zod validation schema for user in lib/validators/user.ts
- [x] T019 [P] Create Zod validation schema for building in lib/validators/building.ts
- [x] T020 [P] Create Zod validation schema for apartment in lib/validators/apartment.ts
- [x] T021 [P] Create Zod validation schema for customer in lib/validators/customer.ts
- [x] T022 [P] Create Zod validation schema for invoice (with line items) in lib/validators/invoice.ts
- [x] T023 [P] Create Zod validation schema for expense in lib/validators/expense.ts
- [x] T024 [P] Create Zod validation schema for journal entry (with balance validation) in lib/validators/journal-entry.ts

### Firebase Infrastructure

- [x] T025 Create Firebase client initialization with offline persistence in lib/firebase/config.ts using `persistentLocalCache({ tabManager: persistentMultipleTabManager() })` as client-only singleton
- [x] T026 Create typed Firestore converters and collection references for all 11 collections in lib/firebase/firestore.ts
- [x] T027 [P] Create Firebase Auth helpers (sign in, sign out, token refresh, onAuthStateChanged) in lib/firebase/auth.ts
- [x] T028 [P] Create Firebase Storage helpers (upload receipt, download URL, delete) in lib/firebase/storage.ts
- [x] T029 [P] Create Firestore Security Rules in firebase/firestore.rules with all helper functions and collection rules per security-rules.md
- [x] T030 [P] Create composite indexes in firebase/firestore.indexes.json per security-rules.md (11 indexes for invoices, journalEntries, expenses, apartments)
- [x] T031 [P] Create Storage Security Rules in firebase/storage.rules (authenticated upload for receipts/logos, size limits)

### i18n & RTL

- [x] T032 Create next-intl routing configuration in lib/i18n/routing.ts with locales ['ar', 'en'], defaultLocale 'ar', localePrefix 'as-needed'
- [x] T033 Create next-intl request configuration in lib/i18n/request.ts
- [x] T034 Create next-intl middleware in middleware.ts
- [x] T035 [P] Create Arabic translation file lib/i18n/messages/ar.json with keys for all UI labels, form fields, error messages, and navigation
- [x] T036 [P] Create English translation file lib/i18n/messages/en.json with matching keys

### Layout & Auth

- [x] T037 Create root layout in app/layout.tsx (minimal — html, body, metadata)
- [x] T038 Create locale layout in app/[locale]/layout.tsx with Cairo + Geist Sans fonts, dir/lang attributes, next-intl provider
- [x] T039 [P] Create utility functions for dates (Hijri/Gregorian formatting, UTC+3) in lib/utils/dates.ts
- [x] T040 [P] Create utility functions for Arabic-Indic numeral formatting in lib/utils/numbers.ts
- [x] T041 [P] Create utility functions for SAR currency formatting in lib/utils/currency.ts
- [x] T042 Create authentication state hook (useAuth) in lib/hooks/use-auth.ts with Firebase Auth onAuthStateChanged, user doc listener, role/permissions
- [x] T043 Create typed Firestore query hooks (useCollection, useDocument with real-time listeners) in lib/hooks/use-firestore.ts
- [x] T044 Create permission guard hook (usePermission) and PermissionGuard component in lib/permissions/guard.tsx
- [x] T045 [P] Create permission feature flag definitions and defaults in lib/permissions/feature-flags.ts
- [x] T046 Create login page with email/password form at app/[locale]/(auth)/login/page.tsx
- [x] T047 Create auth route group layout at app/[locale]/(auth)/layout.tsx (centered card layout, no sidebar)

### Dashboard Shell

- [x] T048 Create dashboard layout with sidebar and topbar at app/[locale]/(dashboard)/layout.tsx with auth guard (redirect to login if not authenticated)
- [x] T049 [P] Create sidebar navigation component in components/layout/sidebar.tsx with permission-based menu items
- [x] T050 [P] Create topbar component in components/layout/topbar.tsx with language toggle, user menu, sync indicator
- [x] T051 [P] Create shared bilingual input component in components/shared/bilingual-input.tsx (dual Arabic/English fields)
- [x] T052 [P] Create shared data table component in components/shared/data-table.tsx with RTL support, sorting, filtering
- [x] T053 Create admin seed script in scripts/seed-admin.ts using Firebase Admin SDK (create Auth user, set custom claims, create Firestore doc)

### Accounting Engine (shared by multiple stories)

- [x] T054 Create predefined Chart of Accounts (Saudi conventions) in lib/accounting/chart-of-accounts.ts with all accounts from data-model.md (1xxx Assets through 5xxx Expenses)
- [x] T055 Create balance validator (totalDebits === totalCredits) in lib/accounting/balance-validator.ts
- [x] T056 Create journal engine with pure functions in lib/accounting/journal-engine.ts: createInvoiceEntry, createPaymentEntry, createCancellationEntry, createExpenseEntry

### ZATCA Engine (shared by invoice stories)

- [x] T057 Create TLV encoder in lib/zatca/tlv-encoder.ts with UTF-8 TextEncoder, 5 tags, Base64 output per research.md
- [x] T058 Create QR code generator from TLV Base64 in lib/zatca/qr-generator.ts using qrcode library
- [x] T059 [P] Create ZATCA invoice field validator in lib/zatca/invoice-validator.ts

### Audit Log (shared by all stories)

- [x] T060 Create audit log write helper (addAuditEntry) in lib/firebase/firestore.ts or lib/utils/audit.ts for append-only audit logging

### Sync Infrastructure

- [x] T061 Create sync status manager in lib/sync/sync-manager.ts monitoring hasPendingWrites and fromCache with includeMetadataChanges
- [x] T062 [P] Create sync status hook (useSyncStatus) in lib/hooks/use-sync-status.ts
- [x] T063 [P] Create sync status indicator component in components/layout/sync-indicator.tsx (Synced/Syncing/Offline/Pending/Error states)
- [x] T064 Create invoice sequence manager in lib/sync/invoice-sequence.ts with offline temporary OFFLINE-{deviceId}-{seq} prefix strategy
- [x] T065 [P] Create conflict resolver with LWW and audit logging in lib/sync/conflict-resolver.ts

**Checkpoint**: Foundation ready — user story implementation can now begin

---

## Phase 3: User Story 2 — Building and Apartment Management (Priority: P1) MVP

**Goal**: Admin adds buildings with bilingual names and manages apartments with occupancy tracking across all buildings

**Independent Test**: Add buildings and apartments, change statuses, verify occupancy overview reflects accurate counts

**Why first**: Buildings and apartments are foundational entities referenced by customers, invoices, and expenses. Other P1 stories depend on buildings/apartments existing.

### Implementation for User Story 2

- [x] T066 [P] [US2] Create building list page at app/[locale]/(dashboard)/buildings/page.tsx with data table showing all active buildings, occupancy counts, and add button
- [x] T067 [P] [US2] Create building form page at app/[locale]/(dashboard)/buildings/new/page.tsx with bilingual name, address, floors, description fields using react-hook-form + Zod
- [x] T068 [US2] Create building detail/edit page at app/[locale]/(dashboard)/buildings/[id]/page.tsx showing building info, apartment list, occupancy summary, edit/deactivate actions
- [x] T069 [P] [US2] Create apartment form (add apartment under building) at app/[locale]/(dashboard)/buildings/[id]/apartments/new/page.tsx with unit number, floor, rooms, area, monthly rent
- [x] T070 [US2] Create apartment detail/edit page at app/[locale]/(dashboard)/apartments/[id]/page.tsx with status management, customer link display, edit fields
- [x] T071 [US2] Implement Firestore operations for buildings: create (with initial counts=0), update, deactivate (with occupied check warning), list active per firestore-operations.md
- [x] T072 [US2] Implement Firestore operations for apartments: create (batch with building count update), update status (batch with building count adjustment), list by building per firestore-operations.md
- [x] T073 [US2] Add building and apartment CRUD audit log entries on all create/update/deactivate operations

**Checkpoint**: Buildings and apartments are manageable with occupancy overview working

---

## Phase 4: User Story 3 — Customer (Tenant) Management and Lease Linking (Priority: P1)

**Goal**: Create tenant records with bilingual names and IDs, link them to apartments changing status to occupied, view customer invoice history

**Independent Test**: Create a customer, link to an apartment, verify apartment status changes, view customer invoice history

**Depends on**: US2 (buildings/apartments must exist)

### Implementation for User Story 3

- [x] T074 [P] [US3] Create customer list page at app/[locale]/(dashboard)/customers/page.tsx with data table, search by name/national ID, add button
- [x] T075 [P] [US3] Create customer form page at app/[locale]/(dashboard)/customers/new/page.tsx with bilingual name, national ID, phone, email, nationality, ID expiry, notes
- [x] T076 [US3] Create customer detail page at app/[locale]/(dashboard)/customers/[id]/page.tsx showing customer info, linked apartment, invoice history, edit/deactivate actions
- [x] T077 [US3] Implement Firestore operations for customers: create (with nationalId uniqueness check), update, deactivate, list active, search by nationalId per firestore-operations.md
- [x] T078 [US3] Implement customer-apartment linking: batched write to update apartment status to occupied, set currentCustomerId/leaseStart/leaseEnd, update customer currentApartmentId/currentBuildingId, adjust building counts per firestore-operations.md
- [x] T079 [US3] Implement customer-apartment unlinking: batched write to revert apartment to vacant, clear customer apartment fields, adjust building counts per firestore-operations.md
- [x] T080 [US3] Implement customer invoice history query (invoices by customerId, ordered by createdAt desc) in customer detail page
- [x] T081 [P] [US3] Create shared Hijri date picker component in components/shared/hijri-date-picker.tsx for ID expiry and lease dates
- [x] T082 [US3] Add customer CRUD and lease linking/unlinking audit log entries

**Checkpoint**: Customers can be created, linked to apartments, and their invoice history viewed

---

## Phase 5: User Story 1 — Invoice Creation and ZATCA-Compliant Billing (Priority: P1)

**Goal**: Create rental invoices with auto-sequential numbering, 15% VAT calculation, ZATCA Phase 1 QR code, and automatic double-entry journal entries. Print/export as PDF with Arabic RTL

**Independent Test**: Create a customer and apartment, generate an invoice, verify QR code, VAT, journal entry, and PDF output

**Depends on**: US2 (apartments), US3 (customers), Foundational (ZATCA engine, journal engine, accounting)

### Implementation for User Story 1

- [x] T083 [US1] Create invoice list page at app/[locale]/(dashboard)/invoices/page.tsx with data table, status filter (Draft/Issued/Paid/Partially Paid/Overdue/Cancelled), building filter
- [x] T084 [US1] Create invoice form component in components/invoices/invoice-form.tsx with customer selector, apartment selector (auto-populated from customer link), rental period, line items, VAT auto-calculation
- [x] T085 [US1] Create new invoice page at app/[locale]/(dashboard)/invoices/new/page.tsx using invoice-form component
- [x] T086 [US1] Implement invoice creation Firestore operation: transaction on counters/invoices for sequential number, addDoc invoice with ZATCA QR, addDoc journal entry (DR: AR, CR: Revenue + VAT Payable), addDoc audit log — all as batched write per firestore-operations.md
- [x] T087 [US1] Create invoice detail/view page at app/[locale]/(dashboard)/invoices/[id]/page.tsx showing all invoice fields, QR code display, status history, action buttons (print, pay, cancel, update)
- [x] T088 [P] [US1] Create ZATCA QR code display component in components/invoices/zatca-qr.tsx using qrcode.react for inline rendering
- [x] T089 [P] [US1] Create invoice summary card component in components/invoices/invoice-card.tsx for use in list views
- [x] T090 [US1] Create invoice PDF generation component in components/invoices/invoice-pdf.tsx using jsPDF + jspdf-autotable with Amiri font, company logo, QR code (canvas → toDataURL → addImage), Arabic RTL layout
- [x] T091 [US1] Download and place Amiri TTF font file in public/fonts/Amiri-Regular.ttf for PDF embedding
- [x] T092 [US1] Add invoice creation audit log entries with ZATCA QR data verification

**Checkpoint**: Invoices can be created with ZATCA QR codes, sequential numbers, VAT, journal entries, and PDF export

---

## Phase 6: User Story 4 — Invoice Lifecycle Management (Priority: P1)

**Goal**: Full invoice lifecycle: update (credit note + new debit note), cancel (credit note), record payment (status transition + journal entry). All actions generate QR codes and journal entries

**Independent Test**: Create invoice, update it (verify credit/debit notes), cancel another (verify credit note), record payment (verify status and journal)

**Depends on**: US1 (invoices must exist)

### Implementation for User Story 4

- [x] T093 [US4] Implement invoice update operation: create credit note referencing original, create new debit note with updated amounts, mark original as cancelled, generate QR codes for both, create reversal + new journal entries — all as batched write per firestore-operations.md
- [x] T094 [US4] Implement invoice cancellation operation: create credit note with cancellation reason and QR code, mark original as cancelled (never delete), create reversal journal entry — batched write per firestore-operations.md
- [x] T095 [US4] Implement payment recording operation: update invoice paymentAmount/paymentDate/status (paid vs partially_paid based on amount), create journal entry (DR: Cash/Bank, CR: AR) — batched write per firestore-operations.md
- [x] T096 [US4] Add status transition validation: prevent update on paid/cancelled invoices, prevent cancel on already cancelled, validate payment preconditions (status must be issued/partially_paid/overdue)
- [x] T097 [US4] Add invoice status history tracking: append StatusChange entry with timestamp, userId, note on every status transition
- [x] T098 [US4] Create invoice update form/dialog on invoice detail page for editing amounts (triggers credit note + new invoice flow)
- [x] T099 [US4] Create payment recording form/dialog on invoice detail page with amount field, auto-calculate remaining balance
- [x] T100 [US4] Create cancellation dialog on invoice detail page with required reason text field
- [x] T101 [US4] Add invoice lifecycle audit log entries for all update, cancel, and payment actions

**Checkpoint**: Full invoice lifecycle (create → update/cancel → pay) working with ZATCA compliance

---

## Phase 7: User Story 5 — Company Profile Setup (Priority: P2)

**Goal**: Admin configures company profile with bilingual name, logo, CR/VAT numbers, structured address, contact info. Data populates invoice headers

**Independent Test**: Fill company profile, generate an invoice, verify company details appear on printed output

### Implementation for User Story 5

- [x] T102 [US5] Create company profile settings page at app/[locale]/(dashboard)/settings/company/page.tsx with form for all company fields (bilingual name, logo upload, CR number, VAT number, structured bilingual address, phone, email, website, VAT rate, session timeout, expense categories)
- [x] T103 [US5] Implement company logo upload to Firebase Storage via lib/firebase/storage.ts with preview and URL storage
- [x] T104 [US5] Implement company profile read/write Firestore operations using setDoc with merge per firestore-operations.md
- [x] T105 [US5] Add company profile audit log entries on update
- [x] T106 [US5] Wire company profile data into invoice PDF header (logo, name, VAT number, address) via invoice-pdf.tsx

**Checkpoint**: Company profile configurable by admin, data flows to invoice headers

---

## Phase 8: User Story 6 — User Management and Permissions (Priority: P2)

**Goal**: Admin creates user accounts with feature toggle matrix. Default permissions: create invoices, add expenses, change password. Admin can toggle per-user permissions

**Independent Test**: Create user with default permissions, verify restrictions, toggle permissions, confirm access changes

### Implementation for User Story 6

- [x] T107 [US6] Create user management page at app/[locale]/(dashboard)/settings/users/page.tsx with user list, add button (admin only)
- [x] T108 [US6] Create user creation form/page at app/[locale]/(dashboard)/settings/users/new/page.tsx with username, bilingual name, password, phone, email fields
- [x] T109 [US6] Create user detail/edit page at app/[locale]/(dashboard)/settings/users/[id]/page.tsx with permission toggle matrix, activate/deactivate button
- [x] T110 [US6] Implement user creation: create Firebase Auth user (via API route calling Admin SDK), set custom claims { role: "user" }, create Firestore user doc with default permissions per firestore-operations.md
- [x] T111 [US6] Create Next.js API route at app/api/users/create/route.ts for server-side Firebase Admin SDK user creation and custom claims setting
- [x] T112 [US6] Implement permission update: updateDoc on users/{uid}.permissions, trigger client token refresh per firestore-operations.md
- [x] T113 [US6] Implement user deactivation: set isActive=false in Firestore, disable Firebase Auth account via API route, per firestore-operations.md
- [x] T114 [US6] Create user profile (own password change) page at app/[locale]/(dashboard)/profile/page.tsx
- [x] T115 [US6] Add user management audit log entries for create, permission change, activate/deactivate

**Checkpoint**: Admin can create users, toggle permissions, deactivate accounts

---

## Phase 9: User Story 7 — Expense Tracking (Priority: P2)

**Goal**: Record expenses with category, amount, optional VAT, building association, receipt upload. Auto-generate journal entries. Admin filters and exports expense reports

**Independent Test**: Record expenses across categories/buildings, verify journal entries, filter and export reports

### Implementation for User Story 7

- [x] T116 [US7] Create expense list page at app/[locale]/(dashboard)/expenses/page.tsx with data table, filters by date range, category, building
- [x] T117 [US7] Create expense form page at app/[locale]/(dashboard)/expenses/new/page.tsx with date, category (from company.expenseCategories), amount, VAT, description, building/apartment selectors, receipt upload
- [x] T118 [US7] Implement expense creation Firestore operation: addDoc expense, upload receipt to Storage, addDoc journal entry (DR: Expense Account by category, CR: Cash/Bank), addDoc audit log — batched write per firestore-operations.md
- [x] T119 [US7] Implement expense list queries with filters: by category, by building, by date range per firestore-operations.md
- [x] T120 [US7] Implement expense category management in company profile settings (add, rename, deactivate categories)
- [x] T121 [US7] Add expense audit log entries

**Checkpoint**: Expenses can be recorded with receipts, journal entries auto-generated, filterable reports

---

## Phase 10: User Story 8 — Double-Entry Accounting Journal (Priority: P2)

**Goal**: View journal entries (auto-generated + manual), create manual balanced entries, manage chart of accounts, filter journal by date/account/type

**Independent Test**: Create invoices and expenses, verify automatic journal entries, create manual entry, filter/view journal

### Implementation for User Story 8

- [ ] T122 [US8] Create journal entries list page at app/[locale]/(dashboard)/journal/page.tsx with data table, filters by date range, account, entry type (invoice/expense/manual), building
- [ ] T123 [US8] Create manual journal entry form at app/[locale]/(dashboard)/journal/new/page.tsx with date, description, multiple debit/credit lines, real-time balance validation (totalDebits === totalCredits)
- [ ] T124 [P] [US8] Create journal entry form component in components/accounting/journal-entry-form.tsx with dynamic line add/remove, account selector, balance indicator
- [ ] T125 [P] [US8] Create chart of accounts tree view component in components/accounting/chart-of-accounts.tsx
- [ ] T126 [P] [US8] Create debit/credit balance indicator component in components/accounting/balance-indicator.tsx
- [ ] T127 [US8] Implement manual journal entry creation with balance enforcement per firestore-operations.md
- [ ] T128 [US8] Implement chart of accounts seeding: on first load, seed predefined accounts from chart-of-accounts.ts into Firestore accounts collection if empty
- [ ] T129 [US8] Implement admin ability to add custom sub-accounts to chart of accounts
- [ ] T130 [US8] Implement journal entry list queries with filters per firestore-operations.md
- [ ] T131 [US8] Add manual journal entry audit log entries

**Checkpoint**: Full journal view with auto/manual entries, chart of accounts, filtering

---

## Phase 11: User Story 13 — Bilingual Interface (Arabic-First) (Priority: P2)

**Goal**: Full RTL Arabic layout by default, English LTR toggle. Dual date formats (Hijri + Gregorian), Arabic-Indic numerals in Arabic mode, SAR currency

**Independent Test**: Switch between Arabic/English, verify RTL/LTR layouts, date formats, numeral display, currency formatting across all pages

### Implementation for User Story 13

- [ ] T132 [US13] Implement language toggle component in topbar that switches locale via next-intl routing (Arabic ↔ English) and persists preference
- [ ] T133 [US13] Audit and update all pages to use next-intl `useTranslations()` for every user-facing string
- [ ] T134 [US13] Audit all pages for Tailwind logical property compliance — replace any physical directional properties (ml/mr/pl/pr/left/right) with logical equivalents (ms/me/ps/pe/start/end)
- [ ] T135 [US13] Implement dual Hijri + Gregorian date display throughout all date fields using lib/utils/dates.ts
- [ ] T136 [US13] Implement Arabic-Indic numeral formatting in Arabic mode via lib/utils/numbers.ts across all numeric displays
- [ ] T137 [US13] Implement SAR currency display (ر.س in Arabic, SAR in English) via lib/utils/currency.ts across all monetary amounts
- [ ] T138 [US13] Verify bilingual input (Arabic + English) works on all form fields that appear on invoices/documents via components/shared/bilingual-input.tsx

**Checkpoint**: Full bilingual experience with correct RTL/LTR, Hijri dates, Arabic numerals, SAR formatting

---

## Phase 12: User Story 9 — Offline Mode and Automatic Sync (Priority: P2)

**Goal**: Full offline operation after initial load. Data stored locally, auto-sync on reconnect. Client-side QR generation. Sync indicator. LWW conflict resolution with logging

**Independent Test**: Go offline, perform CRUD operations and generate invoices with QR codes, restore connectivity, verify all data syncs

### Implementation for User Story 9

- [ ] T139 [US9] Verify and test offline Firestore persistence setup from T025 — confirm all CRUD operations work offline (buildings, apartments, customers, invoices, expenses, journal entries)
- [ ] T140 [US9] Integrate sync indicator component (T063) into dashboard layout topbar — show real-time sync status (Synced/Syncing/Offline/Pending/Error)
- [ ] T141 [US9] Implement offline invoice creation with temporary OFFLINE-{deviceId}-{seq} numbering from lib/sync/invoice-sequence.ts, verify QR code generation works offline
- [ ] T142 [US9] Implement sync conflict resolution: LWW with server timestamp via lib/sync/conflict-resolver.ts, log conflicts to auditLog with syncConflict=true
- [ ] T143 [US9] Display pending sync count and offline indicator across all pages
- [ ] T144 [US9] Handle 500 pending writes limit: warn user when approaching limit, prevent new writes at limit

**Checkpoint**: App works fully offline with auto-sync and conflict handling

---

## Phase 13: User Story 10 — PWA Installation and Mobile Experience (Priority: P3)

**Goal**: Installable PWA with service worker caching, proper manifest, offline shell, optional push notifications

**Independent Test**: Install PWA on mobile/desktop, verify offline shell caching, check push notifications

### Implementation for User Story 10

- [ ] T145 [P] [US10] Create PWA manifest in app/manifest.ts with Arabic metadata (name: "إيجار برو", dir: "rtl", lang: "ar", display: "standalone", icons, theme color)
- [ ] T146 [US10] Create service worker source in app/sw.ts with Serwist: precache app shell + icons + default locale, runtime caching strategies (NetworkOnly for auth, NetworkFirst for API, CacheFirst for static assets, StaleWhileRevalidate for default)
- [ ] T147 [P] [US10] Create PWA icons (192x192, 512x512) in public/icons/
- [ ] T148 [US10] Create offline fallback page at app/[locale]/~offline/page.tsx
- [ ] T149 [US10] Configure Firebase Cloud Messaging: create public/firebase-messaging-sw.js, implement notification permission request, store FCM tokens per user in Firestore

**Checkpoint**: PWA installable with offline caching and optional push notifications

---

## Phase 14: User Story 11 — Public Landing Page (Priority: P3)

**Goal**: Professional bilingual landing page describing Ijar Pro, WhatsApp FAB (+966543620486), Login button, no signup. Uses frontend-design skill for distinctive design

**Independent Test**: Visit public URL, toggle language, tap FAB for WhatsApp, click Login to auth page

### Implementation for User Story 11

- [ ] T150 [US11] Create public landing page at app/[locale]/page.tsx using **frontend-design skill** for distinctive Arabic-first design — hero section, feature highlights, bilingual toggle, Login button (→ /login), no signup
- [ ] T151 [P] [US11] Create floating WhatsApp FAB component in components/layout/whatsapp-fab.tsx linking to https://wa.me/966543620486
- [ ] T152 [US11] Ensure landing page is public (no auth required) and responsive mobile-first with Arabic RTL default

**Checkpoint**: Professional landing page live with WhatsApp contact and login access

---

## Phase 15: User Story 12 — Dashboard and Reports (Priority: P3)

**Goal**: Admin dashboard with key metrics (buildings, apartments, occupancy, revenue, expenses, receivables, activity log). Reports: occupancy, revenue by building/period, expenses by category/building, tenant aging, VAT report

**Independent Test**: Populate sample data, verify dashboard metrics and report outputs reflect accurate aggregations

### Implementation for User Story 12

- [ ] T153 [US12] Create dashboard home page at app/[locale]/(dashboard)/page.tsx with metric cards: total buildings, total apartments, occupancy rate, current month/year revenue, total expenses, outstanding receivables
- [ ] T154 [US12] Implement dashboard metric aggregation queries from Firestore (building counts from buildings collection, invoice/expense sums with date filters)
- [ ] T155 [US12] Create recent activity log section on dashboard showing latest auditLog entries
- [ ] T156 [US12] Create reports page at app/[locale]/(dashboard)/reports/page.tsx with report type selector
- [ ] T157 [P] [US12] Implement occupancy report: building-by-building apartment status breakdown
- [ ] T158 [P] [US12] Implement revenue report: revenue by building and period with recharts visualization
- [ ] T159 [P] [US12] Implement expense report: expenses by category, building, and period
- [ ] T160 [P] [US12] Implement tenant aging report: overdue invoices grouped by aging buckets (Current, 1-30, 31-60, 61-90, 90+ days)
- [ ] T161 [US12] Implement VAT report for ZATCA filing: total VAT collected (invoices) vs total VAT paid (expenses) for specified period
- [ ] T162 [US12] Add report export functionality (PDF download for each report type)

**Checkpoint**: Dashboard displays accurate metrics, all reports generate correctly

---

## Phase 16: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T163 Implement session timeout: auto-logout after configurable period (from company.sessionTimeout) with warning dialog
- [ ] T164 Implement overdue invoice detection: scheduled check (or on-load check) to transition issued/partially_paid invoices past due date to overdue status
- [ ] T165 [P] Add loading states and skeleton screens across all list pages and forms
- [ ] T166 [P] Add error boundary components with user-friendly error messages and retry options
- [ ] T167 [P] Add toast notifications (via sonner) for all CRUD operations success/failure across all pages
- [ ] T168 Implement ID expiry warning: display warning on customer records where idExpiry has passed (per edge case)
- [ ] T169 Implement configurable VAT rate: existing invoices retain original rate, new invoices use company.vatRate (per edge case)
- [ ] T170 Audit all pages for performance: code-split per route via next/dynamic, verify bundle < 300KB initial JS
- [ ] T171 Run Lighthouse audit and fix any PWA, performance, or accessibility issues (target: PWA 100%, Performance 90+)
- [ ] T172 Run quickstart.md validation: verify all setup steps work for a fresh clone

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **US2 Buildings (Phase 3)**: Depends on Foundational — first user story (foundational entity)
- **US3 Customers (Phase 4)**: Depends on US2 (needs buildings/apartments to link customers)
- **US1 Invoices (Phase 5)**: Depends on US2 + US3 (needs apartments and customers)
- **US4 Invoice Lifecycle (Phase 6)**: Depends on US1 (needs invoices to update/cancel/pay)
- **US5 Company Profile (Phase 7)**: Depends on Foundational only — can run in parallel with US2-US4
- **US6 User Management (Phase 8)**: Depends on Foundational only — can run in parallel with other stories
- **US7 Expenses (Phase 9)**: Depends on Foundational + US2 (building association) — can start after US2
- **US8 Journal (Phase 10)**: Depends on Foundational + some financial operations existing (US1, US7)
- **US13 Bilingual (Phase 11)**: Depends on most UI being built — best done after US1-US8
- **US9 Offline (Phase 12)**: Depends on core features built — validates offline for all operations
- **US10 PWA (Phase 13)**: Depends on Foundational — can be done in parallel with user stories
- **US11 Landing (Phase 14)**: Depends on Foundational — independent of other stories
- **US12 Dashboard (Phase 15)**: Depends on US1-US8 (needs data to aggregate)
- **Polish (Phase 16)**: Depends on all desired user stories being complete

### User Story Dependency Graph

```
Phase 1: Setup
    ↓
Phase 2: Foundational
    ↓
    ├── Phase 3: US2 Buildings ─────────────────────────┐
    │       ↓                                           │
    │   Phase 4: US3 Customers ──────┐                  │
    │       ↓                        │                  │
    │   Phase 5: US1 Invoices ───────┤                  │
    │       ↓                        │                  │
    │   Phase 6: US4 Invoice Lifecycle                  │
    │                                │                  │
    ├── Phase 7: US5 Company Profile (parallel) ─┐      │
    ├── Phase 8: US6 User Management (parallel) ─┤      │
    ├── Phase 9: US7 Expenses (after US2) ───────┤      │
    │                                            ↓      │
    │                           Phase 10: US8 Journal   │
    │                                            ↓      │
    │                          Phase 11: US13 Bilingual  │
    │                                            ↓      │
    │                          Phase 12: US9 Offline     │
    │                                                   │
    ├── Phase 13: US10 PWA (parallel) ──────────────────┤
    ├── Phase 14: US11 Landing (parallel) ──────────────┤
    │                                                   │
    └── Phase 15: US12 Dashboard (after US1-US8) ───────┘
                        ↓
                Phase 16: Polish
```

### Parallel Opportunities

**After Foundational completes, these can run simultaneously:**
- US2 (Buildings) — must start first among P1 stories
- US5 (Company Profile) — independent
- US6 (User Management) — independent
- US10 (PWA) — independent
- US11 (Landing Page) — independent

**After US2 completes:**
- US3 (Customers) + US7 (Expenses) — can run in parallel

**After US3 completes:**
- US1 (Invoices) — can proceed

---

## Parallel Example: Phase 2 (Foundational)

```
# These tasks can all run in parallel (different files):
T013: lib/types/models.ts
T014: lib/types/accounting.ts
T015: lib/types/permissions.ts
T016: lib/types/zatca.ts
T017-T024: lib/validators/*.ts (all 8 validators in parallel)
T029: firebase/firestore.rules
T030: firebase/firestore.indexes.json
T031: firebase/storage.rules
T035: lib/i18n/messages/ar.json
T036: lib/i18n/messages/en.json
T039: lib/utils/dates.ts
T040: lib/utils/numbers.ts
T041: lib/utils/currency.ts
```

---

## Implementation Strategy

### MVP First (US2 → US3 → US1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: US2 Buildings
4. Complete Phase 4: US3 Customers
5. Complete Phase 5: US1 Invoices
6. **STOP and VALIDATE**: Test invoice creation end-to-end with ZATCA QR
7. Deploy/demo if ready — this is a ZATCA-compliant invoice tool

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. US2 Buildings → Manage properties
3. US3 Customers → Link tenants to apartments
4. US1 Invoices → ZATCA-compliant billing (MVP!)
5. US4 Invoice Lifecycle → Full billing operations
6. US5 Company Profile + US6 User Management → Multi-user ready
7. US7 Expenses + US8 Journal → Complete accounting
8. US13 Bilingual audit → Polish Arabic/English experience
9. US9 Offline + US10 PWA → Offline-capable installable app
10. US11 Landing + US12 Dashboard → Public face + management overview
11. Polish → Production readiness

---

## Notes

- [P] tasks = different files, no dependencies — safe to run in parallel
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable at its checkpoint
- Commit after each task: `feat(TASK_ID): SHORT_DESCRIPTION`
- All financial writes must include journal entries (Constitution Article VI)
- All significant actions must create audit log entries (Constitution Article IX)
- All UI must use Tailwind logical properties, never physical directional (Constitution Article IV)
- All invoices must include ZATCA QR codes (Constitution Article V)
- All Firestore operations via typed converters (Constitution Article XI)
