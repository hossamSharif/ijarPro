

Build "إيجار برو" (Ijar Pro) — a multi-building apartment rental management platform targeting property management companies in Saudi Arabia. The platform enables a company (property owner or management firm) to manage the full lifecycle of renting apartments across multiple buildings, handle invoicing with ZATCA Phase 1 (Fatoorah) compliance, track expenses, and maintain a standard double-entry accounting journal — all with offline-first capability and PWA installability.

## WHY THIS EXISTS

Property management companies in Saudi Arabia manage dozens to hundreds of apartment units across multiple buildings. They need a unified system to:
- Track which apartments are occupied, vacant, or under maintenance across all their buildings.
- Create, update, and cancel rental invoices while staying compliant with Saudi ZATCA e-invoicing regulations (Phase 1 — QR code generation, simplified tax invoices).
- Track company expenses (maintenance, utilities, employee salaries, etc.).
- Maintain a proper accounting journal where every financial action (invoice creation, cancellation, expense recording) automatically generates the corresponding double-entry journal entries.
- Operate reliably even with poor or no internet connectivity (common in some areas), with automatic data synchronization when connectivity is restored.

The target users are Saudi-based property management companies, with the primary UI language being Arabic (RTL-first) and English as a secondary language.

## WHO USES IT

There are exactly two user roles:

### 1. Admin (Company Owner / Manager)
- Has full unrestricted access to every feature in the system.
- Creates and manages user accounts.
- Controls user permissions by enabling/disabling specific features per user (granular feature-based authorization).
- Manages the company profile (company name in Arabic and English, logo upload, CR number, VAT number, address, phone, email — all required for ZATCA-compliant invoice headers).
- Can view, create, update, cancel invoices, manage expenses, view accounting journal, and access all reports.
- Can create journal entries directly in the accounting section.

### 2. User (Receptionist / Staff)
- Has limited access by default. The default permissions upon account creation are:
  - ✅ Create new invoices (cannot update or cancel).
  - ✅ Change own password.
  - ✅ Add new expenses.
  - ❌ Update existing invoices (requires admin to enable).
  - ❌ Cancel invoices (requires admin to enable).
  - ❌ View accounting journal (requires admin to enable).
  - ❌ Create direct journal entries (requires admin to enable).
  - ❌ Manage buildings/apartments (requires admin to enable).
  - ❌ View reports/dashboard (requires admin to enable).
  - ❌ Manage users (admin-only, never delegatable).
  - ❌ Manage company profile (admin-only, never delegatable).
- Admin can toggle each feature on/off per individual user at any time.
- There is NO self-signup. Users are created exclusively by the admin.

## CORE FEATURES

### F1: Company Profile Management (Admin Only)
- Company name (Arabic + English).
- Logo upload and display (used in invoice headers and app branding).
- Commercial Registration (CR) number.
- VAT Registration Number (required for ZATCA compliance).
- Company address (Arabic + English, structured: street, city, district, postal code, additional number).
- Contact information: phone, email, website.
- All company information appears on generated invoices as per ZATCA requirements.

### F2: User Management (Admin Only)
- Admin creates user accounts with: username, full name (Arabic + English), password, phone number, email.
- Admin can activate/deactivate user accounts.
- Admin controls user permissions via a feature toggle matrix — each toggleable feature can be independently enabled or disabled per user.
- User can only change their own password.
- There is no self-registration. No signup page. No forgot password self-service (user must contact admin).

### F3: Building & Apartment Management
- Admin (or enabled users) can add, edit, and deactivate buildings.
- Each building has: name (Arabic + English), address, number of floors, description, status (active/inactive).
- Under each building, apartments can be added, edited, and deactivated.
- Each apartment has: unit number, floor, number of rooms, area (sqm), monthly rent amount, status (vacant, occupied, under maintenance), description.
- Dashboard or overview showing occupancy status across all buildings.

### F4: Customer (Tenant) Management
- Add, edit, and deactivate customer/tenant records.
- Customer fields: full name (Arabic + English), national ID or Iqama number, phone, email, nationality, ID expiry date, notes.
- Link customers to specific apartments with lease start date and lease end date.
- View customer history: all invoices associated with a customer.

### F5: Invoice Management (ZATCA Phase 1 Compliant)
This is the core transactional feature. Every invoice action must comply with ZATCA Phase 1 simplified tax invoice requirements.

#### F5.1: Create Invoice
- User selects customer and apartment.
- Invoice includes: invoice number (auto-sequential), invoice date, supply date, building name, apartment number, rental period (from–to), rent amount, any additional charges (utilities, services), VAT calculation (15% or as per current Saudi VAT rate), total before VAT, VAT amount, total after VAT.
- Invoice must include all ZATCA-required fields for a simplified tax invoice:
  - Seller name (from company profile).
  - VAT registration number.
  - Invoice date and time (timestamp).
  - Total amount with VAT.
  - VAT amount.
- A QR code is generated on each invoice encoding the ZATCA-required TLV (Tag-Length-Value) data: seller name, VAT number, timestamp, total with VAT, VAT amount.
- Upon invoice creation, a corresponding double-entry journal entry is automatically generated (see F7).

#### F5.2: Update Invoice
- Only allowed before the invoice is marked as paid or cancelled.
- Updating an invoice creates a credit note for the original invoice and a new debit note for the updated amounts, following ZATCA rules for invoice amendments.
- The credit note references the original invoice number.
- A new QR code is generated for the updated invoice.
- Corresponding reversal and new journal entries are automatically generated (see F7).

#### F5.3: Cancel Invoice
- Cancelling an invoice requires admin permission (or user with cancel permission enabled).
- A cancellation creates a credit note referencing the original invoice, as per ZATCA rules.
- The credit note has its own QR code.
- A reverse journal entry is automatically generated to void the original entry (see F7).
- The original invoice is marked as "cancelled" but never deleted from the system (audit trail).
- Reason for cancellation must be recorded.

#### F5.4: Invoice Statuses
- Draft, Issued, Paid, Partially Paid, Overdue, Cancelled.
- Status transitions must be logged with timestamp and user who performed the action.

#### F5.5: Invoice Printing/Export
- Invoices can be printed or exported as PDF.
- The printed/exported invoice displays the QR code, company logo, and all ZATCA-required fields.
- Layout supports Arabic RTL with proper formatting.

### F6: Expense Management
- Users (with default permission) can add expenses.
- Each expense has: date, category (maintenance, utilities, salaries, supplies, other — categories should be customizable by admin), amount, VAT amount (if applicable), description, associated building (optional), associated apartment (optional), receipt/attachment upload.
- Expenses automatically generate corresponding journal entries (see F7).
- Admin can view, filter, and export expense reports by date range, category, building.

### F7: Accounting / Journal Section
This section implements standard double-entry bookkeeping principles. Users interact with invoices and expenses; the system automatically generates the underlying journal entries.

#### F7.1: Automatic Journal Entries
The system must automatically create journal entries for:

- **New Invoice Created:**
  - Debit: Accounts Receivable (by total invoice amount including VAT)
  - Credit: Rental Revenue (by amount before VAT)
  - Credit: VAT Payable (by VAT amount)

- **Invoice Payment Received:**
  - Debit: Cash/Bank
  - Credit: Accounts Receivable

- **Invoice Cancelled (Credit Note):**
  - Reverse of the original invoice entry:
  - Debit: Rental Revenue
  - Debit: VAT Payable
  - Credit: Accounts Receivable

- **Invoice Updated (Amendment):**
  - Reverse entry for the original invoice.
  - New entry for the updated invoice amounts.

- **Expense Recorded:**
  - Debit: Expense Account (categorized)
  - Credit: Cash/Bank

#### F7.2: Manual Journal Entries
- Admin (or enabled users) can create journal entries directly.
- Each entry has: date, description, multiple debit/credit lines, each line has: account, amount, description.
- The entry must balance (total debits = total credits) — the system must enforce this.

#### F7.3: Journal View
- Chronological list of all journal entries (auto-generated and manual).
- Filter by: date range, account, entry type (invoice, expense, manual), building.
- Each entry shows: date, reference (invoice number, expense ID, or "manual"), description, debit/credit lines.

#### F7.4: Chart of Accounts
- A predefined chart of accounts suitable for a property rental business (Assets, Liabilities, Revenue, Expenses, Equity).
- Admin can add custom sub-accounts.
- Accounts are numbered following standard Saudi accounting conventions.

### F8: Offline Mode & Sync
- The entire application must work offline after initial load.
- All CRUD operations (invoices, expenses, customers, buildings, apartments, journal entries) must be performable offline.
- Data created or modified offline is stored locally on the device.
- When connectivity is restored, the system automatically syncs local changes with the server.
- Conflict resolution strategy: last-write-wins with server timestamp, but conflicts are logged for admin review.
- Sync status indicator visible to the user (synced, pending sync, sync error).
- Offline QR code generation must work without server connectivity.

### F9: PWA & Installability
- The application must be a Progressive Web App (PWA) that can be installed on mobile devices and desktops.
- Service worker for offline caching of app shell, static assets, and data.
- App manifest with proper icons, theme color, and display mode (standalone).
- Push notification support for sync completion and important alerts (optional, admin-configurable).

### F10: Landing Page (Public, No Auth)
- This is the public-facing page. There is NO signup option.
- The landing page explains what the app does, its key features, and how to get started (by contacting the company).
- Prominent floating action button (FAB) for "Contact Us" that initiates a WhatsApp or phone call to: +966543620486.
- The page should be clean, professional, bilingual (Arabic/English toggle), and mobile-responsive.
- A "Login" button leads to the authentication page for existing users.

### F11: Dashboard & Reports
- Admin dashboard showing: total buildings, total apartments, occupancy rate, total revenue (current month/year), total expenses, outstanding receivables, recent activity log.
- Reports available: occupancy report, revenue report by building/period, expense report by category/building/period, tenant aging report (overdue invoices), VAT report for ZATCA filing.

## BILINGUAL SUPPORT (Arabic-First)

- The default language is Arabic with full RTL layout.
- Users can switch to English.
- All data entry fields that appear on invoices or official documents must support dual-language input (Arabic + English) where applicable.
- Date formats: Hijri and Gregorian displayed together where appropriate.
- Number formatting: Arabic-Indic numerals (٠١٢٣٤٥٦٧٨٩) as default in Arabic mode, Western numerals in English mode.
- Currency: Saudi Riyal (SAR / ر.س).

## ZATCA PHASE 1 COMPLIANCE REQUIREMENTS

- Every simplified tax invoice must contain: seller name, VAT number, invoice date/time, total with VAT, VAT amount.
- QR code on every invoice encoding TLV-encoded Base64 data with the above fields.
- Credit notes (for cancellations and updates) must reference the original invoice and contain their own QR codes.
- Invoices must never be physically deleted — only cancelled with credit notes.
- Invoice sequential numbering must be maintained without gaps.
- All timestamps must be in Saudi Arabia timezone (AST, UTC+3).

## USER SCENARIOS

### Scenario 1: New Customer Moves In
The receptionist creates a new customer record, links them to a vacant apartment (which changes status to occupied), and creates the first monthly rental invoice. The invoice generates a QR code and a journal entry is automatically recorded.

### Scenario 2: Monthly Rent Collection
The receptionist creates a new invoice for an existing tenant. When the tenant pays, the receptionist marks the invoice as paid, which generates a payment journal entry.

### Scenario 3: Invoice Correction
An admin notices an invoice was created with the wrong amount. They update the invoice, which generates a credit note for the original and a new invoice with the correct amount. Both get QR codes and corresponding journal entries.

### Scenario 4: Tenant Cancels Early
The admin cancels the remaining unpaid invoices with a reason. Each cancellation generates a credit note with QR code and a reversal journal entry.

### Scenario 5: Offline Usage
A receptionist at a building with poor internet creates three invoices and records two expenses. The app stores everything locally. When they return to the office with WiFi, the data syncs automatically.

### Scenario 6: New Staff Onboarding
The admin creates a new user account for a receptionist. By default, the receptionist can only create invoices, add expenses, and change their password. Later, the admin enables "cancel invoice" permission for this user.

### Scenario 7: End-of-Month Accounting
The admin opens the journal section, filters by the current month, and reviews all auto-generated entries from invoices and expenses. They create a manual journal entry for a bank fee. They then generate the VAT report for ZATCA filing.

## CONSTRAINTS

- No public signup — the platform is distributed by the company to its staff.
- All financial records (invoices, journal entries) are immutable once finalized — only cancellation via credit notes is allowed.
- Audit trail: every significant action (create, update, cancel, status change, permission change) must be logged with user, timestamp, and details.
- The app must handle the Saudi VAT rate (currently 15%) but should be configurable in case of rate changes.
- Support for at least 50 buildings and 2000 apartments per company instance.
- The app should load and be interactive within 3 seconds on a standard 4G connection.

## TECH STACK CONSTRAINTS (for /speckit.plan phase)

Note: These are included as context for the planning phase — they should not influence the functional specification:
- Frontend & Backend: Next.js (App Router)
- Database & Auth & Storage: Firebase (Firestore, Auth, Storage)
- UI Components: shadcn/ui with Tailwind CSS
- PWA: next-pwa or similar
- Offline: Firestore offline persistence + custom sync layer
- QR Code: Client-side ZATCA TLV encoding and QR generation