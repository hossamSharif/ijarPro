# Feature Specification: Ijar Pro — Multi-Building Apartment Rental Management Platform

**Feature Branch**: `001-ijar-pro-platform`
**Created**: 2026-02-08
**Status**: Draft
**Input**: User description: "Build إيجار برو (Ijar Pro) — a multi-building apartment rental management platform targeting property management companies in Saudi Arabia"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Invoice Creation and ZATCA-Compliant Billing (Priority: P1)

A receptionist (or admin) selects an existing customer and apartment, then creates a rental invoice. The system automatically calculates VAT (15%), generates a ZATCA Phase 1 compliant QR code encoding the required TLV data (seller name, VAT number, timestamp, total with VAT, VAT amount), assigns a sequential invoice number, and records a double-entry journal entry (debit Accounts Receivable, credit Rental Revenue + VAT Payable). The invoice can be printed or exported as a PDF with full Arabic RTL support, the company logo, and all ZATCA-required fields.

**Why this priority**: Invoice creation is the core revenue-generating activity. Without ZATCA-compliant invoicing, the platform cannot legally operate in Saudi Arabia. This story delivers immediate business value as the primary daily workflow.

**Independent Test**: Can be fully tested by creating a customer, an apartment, and generating an invoice. Delivers value as a standalone ZATCA-compliant invoice generation tool.

**Acceptance Scenarios**:

1. **Given** a registered customer linked to an occupied apartment, **When** the user creates a new invoice specifying the rental period and any additional charges, **Then** the system generates an invoice with auto-sequential number, calculates 15% VAT, produces a ZATCA-compliant QR code, and creates the corresponding journal entry.
2. **Given** an invoice has been created, **When** the user views or prints the invoice, **Then** it displays the company logo, seller name, VAT number, invoice timestamp, total with VAT, VAT amount, QR code, and all fields required by ZATCA Phase 1.
3. **Given** the user is offline, **When** they create an invoice, **Then** the QR code is generated client-side, the invoice is stored locally, and it syncs automatically when connectivity is restored.
4. **Given** the user is a receptionist with default permissions, **When** they attempt to create an invoice, **Then** the system allows it. **When** they attempt to update or cancel, **Then** the system blocks the action.

---

### User Story 2 - Building and Apartment Management (Priority: P1)

An admin (or authorized user) adds buildings with bilingual names, addresses, and floor counts, then creates apartments within each building specifying unit numbers, floor, room count, area, monthly rent, and status. The system provides an occupancy overview across all buildings showing vacant, occupied, and under-maintenance units.

**Why this priority**: Buildings and apartments are foundational entities — invoices, customers, and expenses all reference them. The platform cannot function without the property hierarchy in place.

**Independent Test**: Can be tested by adding buildings and apartments, changing statuses, and verifying the occupancy overview reflects accurate counts.

**Acceptance Scenarios**:

1. **Given** an admin is logged in, **When** they add a new building with Arabic and English names, address, floor count, and description, **Then** the building appears in the buildings list with status "active."
2. **Given** a building exists, **When** the admin adds apartments specifying unit number, floor, rooms, area (sqm), monthly rent, and status, **Then** the apartments appear under that building.
3. **Given** multiple buildings with apartments exist, **When** the admin views the occupancy overview, **Then** they see aggregated counts of vacant, occupied, and under-maintenance units per building and overall.
4. **Given** a building is deactivated, **When** users browse buildings, **Then** the deactivated building is hidden from active lists but its data is preserved.

---

### User Story 3 - Customer (Tenant) Management and Lease Linking (Priority: P1)

A user creates tenant records with bilingual names, national ID or Iqama number, contact details, nationality, and ID expiry date. Tenants are linked to specific apartments with lease start and end dates, which changes the apartment status to "occupied." The system maintains a full invoice history per customer.

**Why this priority**: Customer records are required for invoice creation and are central to lease management. Without tenant data, the invoicing workflow cannot function.

**Independent Test**: Can be tested by creating a customer, linking them to an apartment, verifying apartment status changes, and viewing the customer's invoice history.

**Acceptance Scenarios**:

1. **Given** an authorized user, **When** they create a new customer with full name (Arabic + English), national ID/Iqama, phone, email, nationality, and ID expiry date, **Then** the customer record is saved and searchable.
2. **Given** a customer and a vacant apartment exist, **When** the user links the customer to the apartment with lease start and end dates, **Then** the apartment status changes to "occupied."
3. **Given** a customer has multiple invoices, **When** the user views the customer's history, **Then** all associated invoices are displayed with their current statuses.
4. **Given** a customer record is deactivated, **When** users search for active customers, **Then** the deactivated record is excluded but all historical data and invoices remain accessible.

---

### User Story 4 - Invoice Lifecycle Management (Priority: P1)

An admin manages the full invoice lifecycle: updating an unpaid invoice (which creates a credit note for the original and a new debit note per ZATCA rules), cancelling an invoice (which creates a credit note with cancellation reason), and recording payments (which transitions status and generates payment journal entries). Each action generates appropriate QR codes and automatic journal entries.

**Why this priority**: Invoice updates, cancellations, and payments are essential for day-to-day operations and ZATCA compliance. Credit notes and reversal entries are legally required.

**Independent Test**: Can be tested by creating an invoice, then updating it (verifying credit/debit notes), cancelling another (verifying credit note and reason), and recording a payment (verifying status transition and journal entry).

**Acceptance Scenarios**:

1. **Given** an unpaid invoice exists, **When** the admin updates the rent amount, **Then** the system creates a credit note referencing the original invoice, generates a new invoice with updated amounts, creates QR codes for both, and records reversal + new journal entries.
2. **Given** an invoice exists, **When** an authorized user cancels it with a reason, **Then** the system creates a credit note with its own QR code, marks the original as "cancelled" (never deleted), records the cancellation reason, and generates a reversal journal entry.
3. **Given** an issued invoice, **When** a payment is recorded, **Then** the status transitions to "Paid" (or "Partially Paid" for partial amounts), and a journal entry is created (debit Cash/Bank, credit Accounts Receivable).
4. **Given** an invoice is already paid or cancelled, **When** a user attempts to update it, **Then** the system prevents the modification and displays an appropriate message.
5. **Given** any invoice status change, **When** the transition occurs, **Then** the system logs the timestamp and the user who performed the action.

---

### User Story 5 - Company Profile Setup (Priority: P2)

An admin configures the company profile with bilingual company name, logo, Commercial Registration number, VAT Registration Number, structured address (street, city, district, postal code, additional number in Arabic and English), and contact information. This data populates invoice headers and meets ZATCA requirements.

**Why this priority**: Company profile data is required on every invoice for ZATCA compliance. While critical, it is a one-time setup that unlocks the invoicing workflow.

**Independent Test**: Can be tested by filling in the company profile, then generating an invoice and verifying all company details appear correctly on the printed output.

**Acceptance Scenarios**:

1. **Given** an admin is logged in for the first time, **When** they navigate to company profile settings, **Then** they can enter company name (Arabic + English), upload a logo, and fill in CR number, VAT number, structured address, phone, email, and website.
2. **Given** the company profile is complete, **When** any invoice is generated, **Then** the invoice header displays the company logo, name, VAT number, and full address as required by ZATCA.
3. **Given** a non-admin user, **When** they attempt to access or modify the company profile, **Then** the system denies access.

---

### User Story 6 - User Management and Permissions (Priority: P2)

An admin creates user accounts (username, bilingual full name, password, phone, email) and controls each user's permissions via a feature toggle matrix. Default permissions for new users allow only invoice creation, expense addition, and password changes. The admin can enable or disable individual features (update invoices, cancel invoices, view journal, manage buildings, view reports, etc.) per user at any time.

**Why this priority**: User management enables multi-user operation and security controls. It is essential before the platform can be used by staff beyond the admin.

**Independent Test**: Can be tested by creating a user with default permissions, verifying access restrictions, then toggling permissions and confirming access changes.

**Acceptance Scenarios**:

1. **Given** an admin, **When** they create a new user account, **Then** the user is created with default permissions: create invoices (enabled), add expenses (enabled), change own password (enabled), all other features (disabled).
2. **Given** a user with default permissions, **When** they log in and attempt to cancel an invoice, **Then** the system blocks the action.
3. **Given** an admin enables "cancel invoices" for a user, **When** that user logs in, **Then** they can now cancel invoices.
4. **Given** any user (including admin-authorized users), **When** they attempt to manage users or modify the company profile, **Then** the system blocks the action (admin-only, never delegatable).
5. **Given** an admin deactivates a user account, **When** that user attempts to log in, **Then** authentication is denied.

---

### User Story 7 - Expense Tracking (Priority: P2)

A user records company expenses by specifying date, category, amount, optional VAT, description, optional building/apartment association, and receipt upload. Expense categories are customizable by the admin. Each expense automatically generates a journal entry (debit Expense Account, credit Cash/Bank). The admin can filter and export expense reports by date range, category, and building.

**Why this priority**: Expense tracking completes the financial picture alongside invoicing, enabling accurate profit/loss visibility and VAT reporting.

**Independent Test**: Can be tested by recording expenses across different categories and buildings, verifying journal entries, and filtering/exporting reports.

**Acceptance Scenarios**:

1. **Given** a user with default permissions, **When** they add an expense with date, category, amount, VAT, description, and optional building association, **Then** the expense is saved and a journal entry is automatically created.
2. **Given** an admin, **When** they customize expense categories (add, rename, deactivate categories), **Then** users see updated categories when recording new expenses.
3. **Given** multiple expenses exist, **When** the admin filters by date range, category, or building, **Then** only matching expenses are displayed. **When** the admin exports, **Then** the report is downloadable.
4. **Given** a user uploads a receipt image, **When** the expense is saved, **Then** the receipt is stored and viewable from the expense record.

---

### User Story 8 - Double-Entry Accounting Journal (Priority: P2)

The system maintains a full double-entry accounting journal. Automatic entries are generated for invoice creation, payment, cancellation, update, and expense recording. Admins (or authorized users) can create manual journal entries that must balance (total debits = total credits). A predefined chart of accounts for property rental (Assets, Liabilities, Revenue, Expenses, Equity) is provided, with admin ability to add custom sub-accounts. The journal view supports filtering by date range, account, entry type, and building.

**Why this priority**: The accounting journal provides financial transparency, audit compliance, and is essential for VAT reporting. It ties together all financial transactions.

**Independent Test**: Can be tested by creating invoices and expenses, verifying automatic journal entries appear correctly, creating a manual entry, and filtering/viewing the journal.

**Acceptance Scenarios**:

1. **Given** an invoice is created, **When** the journal is viewed, **Then** an automatic entry exists: debit Accounts Receivable (total with VAT), credit Rental Revenue (amount before VAT), credit VAT Payable (VAT amount).
2. **Given** an admin creates a manual journal entry with multiple debit/credit lines, **When** debits do not equal credits, **Then** the system rejects the entry with a clear error. **When** they balance, **Then** the entry is saved.
3. **Given** the chart of accounts exists, **When** an admin adds a custom sub-account, **Then** it appears in the chart and is available for journal entries.
4. **Given** multiple journal entries exist, **When** a user filters by date range, account, or entry type (invoice, expense, manual), **Then** only matching entries are displayed.

---

### User Story 9 - Offline Mode and Automatic Sync (Priority: P2)

The entire application works offline after initial load. Users can create and modify invoices, expenses, customers, buildings, apartments, and journal entries without internet connectivity. Data is stored locally and syncs automatically when connectivity is restored. QR codes are generated client-side. A sync status indicator shows current state (synced, pending sync, sync error). Conflicts are resolved via last-write-wins with server timestamp, and conflicts are logged for admin review.

**Why this priority**: Offline capability is critical for field staff at buildings with poor connectivity — a common scenario in Saudi Arabia. Without it, the platform fails its "work anywhere" promise.

**Independent Test**: Can be tested by going offline, performing CRUD operations and generating invoices with QR codes, then restoring connectivity and verifying all data syncs to the server.

**Acceptance Scenarios**:

1. **Given** the app has been loaded at least once, **When** the device loses internet connectivity, **Then** all CRUD operations continue to function normally with data stored locally.
2. **Given** data has been created offline, **When** connectivity is restored, **Then** the system automatically syncs all pending changes and updates the sync status indicator from "pending sync" to "synced."
3. **Given** the same record is modified on two devices while offline, **When** both devices sync, **Then** the last-write-wins strategy applies based on server timestamp, and the conflict is logged for admin review.
4. **Given** the user is offline, **When** they create an invoice, **Then** a valid ZATCA QR code is generated client-side without server connectivity.

---

### User Story 10 - PWA Installation and Mobile Experience (Priority: P3)

The application is installable as a Progressive Web App on mobile devices and desktops. It uses a service worker for offline caching of the app shell and static assets. The app manifest provides proper icons, theme color, and standalone display mode. Optional push notifications alert users about sync completion and important events (admin-configurable).

**Why this priority**: PWA installability improves the user experience for field staff who use the app daily on mobile devices, but the core functionality works via browser without installation.

**Independent Test**: Can be tested by installing the PWA on a mobile device and desktop, verifying offline shell caching, and checking that push notifications arrive for configured events.

**Acceptance Scenarios**:

1. **Given** a user visits the application URL on a supported device, **When** they choose to install, **Then** the app installs with the correct icon, name, and opens in standalone mode.
2. **Given** the app is installed, **When** the device is offline, **Then** the app shell and previously cached data load successfully.
3. **Given** an admin enables push notifications, **When** a sync completes or an important event occurs, **Then** the user receives a notification on their device.

---

### User Story 11 - Public Landing Page (Priority: P3)

A public-facing landing page (no authentication required) explains what Ijar Pro does, highlights key features, and provides contact options. It features a prominent floating action button (FAB) for "Contact Us" that initiates a WhatsApp message or phone call to +966543620486. The page is bilingual (Arabic/English toggle), mobile-responsive, and includes a "Login" button for existing users.

**Why this priority**: The landing page serves as the product's public face and entry point but is not required for core operational workflows.

**Independent Test**: Can be tested by visiting the public URL, toggling language, tapping the FAB to verify WhatsApp/phone redirection, and clicking Login to reach the authentication page.

**Acceptance Scenarios**:

1. **Given** a visitor (not logged in), **When** they access the application URL, **Then** they see a professional landing page describing Ijar Pro's features in the selected language (Arabic by default).
2. **Given** the landing page is displayed, **When** the visitor taps the "Contact Us" FAB, **Then** a WhatsApp message or phone call is initiated to +966543620486.
3. **Given** the landing page, **When** the visitor toggles the language, **Then** all content switches between Arabic (RTL) and English (LTR).
4. **Given** the landing page, **When** the visitor clicks "Login," **Then** they are navigated to the authentication page. There is no "Sign Up" option anywhere.

---

### User Story 12 - Dashboard and Reports (Priority: P3)

The admin dashboard displays key metrics: total buildings, total apartments, occupancy rate, current month/year revenue, total expenses, outstanding receivables, and a recent activity log. Available reports include: occupancy report, revenue by building/period, expenses by category/building/period, tenant aging (overdue invoices), and VAT report for ZATCA filing.

**Why this priority**: Dashboards and reports provide management oversight but are not required for day-to-day transactional operations.

**Independent Test**: Can be tested by populating sample data (buildings, apartments, invoices, expenses) and verifying that dashboard metrics and report outputs reflect accurate aggregations.

**Acceptance Scenarios**:

1. **Given** an admin is logged in, **When** they view the dashboard, **Then** they see accurate counts for buildings, apartments, occupancy rate, monthly/yearly revenue, expenses, and outstanding receivables.
2. **Given** invoices and expenses exist, **When** the admin generates a VAT report for a specified period, **Then** the report shows total VAT collected (from invoices) and total VAT paid (from expenses), suitable for ZATCA filing.
3. **Given** overdue invoices exist, **When** the admin views the tenant aging report, **Then** invoices are grouped by aging buckets (e.g., 30, 60, 90+ days overdue) with associated customer and amount details.
4. **Given** a user without report permissions, **When** they attempt to access the dashboard, **Then** the system denies access.

---

### User Story 13 - Bilingual Interface (Arabic-First) (Priority: P2)

The default interface language is Arabic with full RTL layout. Users can switch to English (LTR). All data entry fields on invoices and official documents support dual-language input. Dates display in both Hijri and Gregorian formats. Numbers use Arabic-Indic numerals in Arabic mode and Western numerals in English mode. Currency is displayed as Saudi Riyal (SAR / ر.س).

**Why this priority**: Arabic-first bilingual support is essential for the Saudi target market. Every screen and document must be usable in Arabic to serve the primary user base.

**Independent Test**: Can be tested by switching the interface to Arabic and English, verifying RTL/LTR layouts, checking date formats (Hijri + Gregorian), numeral display, and currency formatting on invoices and throughout the UI.

**Acceptance Scenarios**:

1. **Given** a user opens the application, **When** the language is set to Arabic, **Then** the entire UI renders in RTL layout with Arabic text, Arabic-Indic numerals, and Hijri + Gregorian dates.
2. **Given** the language is switched to English, **When** the UI re-renders, **Then** layout switches to LTR, numerals switch to Western, and dates show Gregorian (with Hijri where appropriate).
3. **Given** a data entry form for invoices, **When** the user enters a building name, **Then** both Arabic and English input fields are available. The invoice displays the name in the active language.
4. **Given** any invoice or document, **When** it is printed or exported, **Then** currency is displayed as "ر.س" or "SAR" depending on the active language.

---

### Edge Cases

- What happens when an invoice is created for an apartment that has no customer linked? The system prevents invoice creation and displays a validation error requiring a customer-apartment link.
- What happens when two users simultaneously create invoices offline and both get the same sequential invoice number? The sync mechanism detects the duplicate and reassigns a new sequential number to the later-synced invoice, maintaining the gap-free sequence.
- What happens when the VAT rate changes from 15%? The admin updates the configurable VAT rate. Existing invoices retain their original VAT rate; only new invoices use the updated rate.
- How does the system handle a customer whose national ID/Iqama has expired? The system displays a warning when the expiry date has passed but does not block operations, allowing the user to decide.
- What happens when the admin deactivates a building that still has occupied apartments? The system warns the admin that occupied apartments exist and requires confirmation before deactivation. Existing leases and invoices remain accessible.
- What happens when a user tries to create a manual journal entry that does not balance? The system rejects the entry and displays the imbalance amount, preventing save until debits equal credits.
- What happens when offline sync fails repeatedly? The sync status indicator shows "sync error," pending changes are preserved locally, and the system retries with exponential backoff. The admin is notified of persistent sync failures.
- What happens when an invoice PDF is generated in Arabic? The PDF renders in RTL with Arabic-Indic numerals, Hijri dates alongside Gregorian, and the QR code in the correct position.
- What happens when the sequential invoice number sequence has potential gaps due to cancelled invoices? Cancelled invoices retain their numbers — the sequence never has gaps. The next invoice always gets the next number in sequence regardless of cancellations.

## Clarifications

### Session 2026-02-08

- Q: What technology stack should be used for Ijar Pro? → A: Next.js frontend connected directly to Firebase (Firestore, Auth, Storage) — no separate backend API layer.
- Q: What is the expected maximum number of concurrent users per company instance? → A: 10-20 concurrent users.
- Q: What security posture should be enforced for data in transit and at rest? → A: Firebase defaults (HTTPS for transit, automatic encryption at rest) + Firestore Security Rules for role-based access control.
- Q: Should the national ID/Iqama number be unique per customer? → A: Yes, enforce uniqueness — reject duplicate national ID/Iqama numbers.
- Q: What is the deployment model for the Next.js app? → A: Firebase Hosting (unified infrastructure with Firebase backend).

## Requirements *(mandatory)*

### Functional Requirements

**Company Profile**
- **FR-001**: System MUST allow the admin to configure a company profile with: company name (Arabic + English), logo, CR number, VAT number, structured address (Arabic + English: street, city, district, postal code, additional number), phone, email, and website.
- **FR-002**: System MUST display all company profile information on every generated invoice as required by ZATCA Phase 1.
- **FR-003**: System MUST restrict company profile management to admin users only.

**User Management**
- **FR-004**: System MUST allow the admin to create user accounts with: username, full name (Arabic + English), password, phone, and email.
- **FR-005**: System MUST assign default permissions to new users: create invoices (enabled), add expenses (enabled), change own password (enabled), all other features (disabled).
- **FR-006**: System MUST allow the admin to toggle each feature permission independently per user via a feature toggle matrix.
- **FR-007**: System MUST restrict user management and company profile management to admin only — these permissions are never delegatable.
- **FR-008**: System MUST allow users to change only their own password.
- **FR-009**: System MUST allow the admin to activate and deactivate user accounts. Deactivated accounts cannot log in.
- **FR-010**: System MUST NOT provide any self-registration, signup page, or forgot-password self-service.

**Authentication**
- **FR-011**: System MUST authenticate users via username and password.
- **FR-012**: System MUST support exactly two roles: Admin (full access) and User (permission-controlled access).
- **FR-013**: System MUST enforce session management and log out inactive users after a configurable timeout period.

**Building & Apartment Management**
- **FR-014**: System MUST allow authorized users to add, edit, and deactivate buildings with: name (Arabic + English), address, number of floors, description, and status (active/inactive).
- **FR-015**: System MUST allow authorized users to add, edit, and deactivate apartments under a building with: unit number, floor, number of rooms, area (sqm), monthly rent amount, status (vacant, occupied, under maintenance), and description.
- **FR-016**: System MUST provide an occupancy overview showing unit status counts across all buildings.
- **FR-017**: System MUST support a minimum of 50 buildings and 2,000 apartments per company instance.

**Customer (Tenant) Management**
- **FR-018**: System MUST allow authorized users to add, edit, and deactivate customer records with: full name (Arabic + English), national ID or Iqama number, phone, email, nationality, ID expiry date, and notes.
- **FR-018a**: System MUST enforce uniqueness of national ID/Iqama number across all customer records (including deactivated). Duplicate entries MUST be rejected with a clear error message.
- **FR-019**: System MUST allow linking a customer to a specific apartment with lease start and end dates.
- **FR-020**: System MUST change apartment status to "occupied" when a customer is linked and back to "vacant" when the lease ends or customer is unlinked.
- **FR-021**: System MUST display the full invoice history for each customer.

**Invoice Management**
- **FR-022**: System MUST generate invoices with auto-sequential numbering that is gap-free.
- **FR-023**: System MUST calculate VAT at the configurable Saudi rate (default 15%) and display total before VAT, VAT amount, and total after VAT.
- **FR-024**: System MUST generate a ZATCA Phase 1 compliant QR code on every invoice, encoding TLV Base64 data: seller name, VAT number, timestamp, total with VAT, VAT amount.
- **FR-025**: System MUST include on every invoice: invoice number, invoice date/time, supply date, building name, apartment number, rental period, rent amount, additional charges, seller name, and VAT registration number.
- **FR-026**: System MUST support invoice statuses: Draft, Issued, Paid, Partially Paid, Overdue, Cancelled.
- **FR-027**: System MUST log every invoice status transition with timestamp and the user who performed the action.
- **FR-028**: System MUST allow invoice updates only when the invoice status is Draft or Issued (not Paid, Partially Paid, or Cancelled).
- **FR-029**: System MUST create a credit note referencing the original invoice when an invoice is updated, and a new debit note for updated amounts, each with its own QR code.
- **FR-030**: System MUST create a credit note with QR code when an invoice is cancelled, recording the cancellation reason, and marking the original as "cancelled" without deletion.
- **FR-031**: System MUST never physically delete an invoice from the system.
- **FR-032**: System MUST allow invoice printing and PDF export with company logo, QR code, all ZATCA-required fields, and Arabic RTL layout support.
- **FR-033**: System MUST use Saudi Arabia timezone (UTC+3) for all invoice timestamps.

**Expense Management**
- **FR-034**: System MUST allow authorized users to record expenses with: date, category, amount, VAT amount (optional), description, optional building/apartment association, and receipt/attachment upload.
- **FR-035**: System MUST provide admin-customizable expense categories (default categories: maintenance, utilities, salaries, supplies, other).
- **FR-036**: System MUST allow admin to filter and export expense reports by date range, category, and building.

**Accounting / Journal**
- **FR-037**: System MUST automatically generate a double-entry journal entry for every invoice creation: debit Accounts Receivable, credit Rental Revenue + VAT Payable.
- **FR-038**: System MUST automatically generate a journal entry for every invoice payment: debit Cash/Bank, credit Accounts Receivable.
- **FR-039**: System MUST automatically generate reversal journal entries for invoice cancellations and updates.
- **FR-040**: System MUST automatically generate a journal entry for every expense: debit Expense Account (by category), credit Cash/Bank.
- **FR-041**: System MUST allow authorized users to create manual journal entries with date, description, and multiple debit/credit lines.
- **FR-042**: System MUST enforce that manual journal entries balance — total debits must equal total credits.
- **FR-043**: System MUST provide a chronological journal view with filtering by date range, account, entry type (invoice, expense, manual), and building.
- **FR-044**: System MUST provide a predefined chart of accounts for property rental (Assets, Liabilities, Revenue, Expenses, Equity) with numbered accounts following Saudi accounting conventions.
- **FR-045**: System MUST allow admin to add custom sub-accounts to the chart of accounts.

**Offline Mode & Sync**
- **FR-046**: System MUST function fully offline after initial load, supporting all CRUD operations on invoices, expenses, customers, buildings, apartments, and journal entries.
- **FR-047**: System MUST store data locally when offline and automatically sync with the server when connectivity is restored.
- **FR-048**: System MUST resolve sync conflicts using last-write-wins with server timestamp, logging all conflicts for admin review.
- **FR-049**: System MUST display a sync status indicator (synced, pending sync, sync error) visible to the user at all times.
- **FR-050**: System MUST generate QR codes client-side without requiring server connectivity.

**PWA & Installability**
- **FR-051**: System MUST be installable as a Progressive Web App on mobile devices and desktops with proper icons, theme color, and standalone display mode.
- **FR-052**: System MUST use a service worker for offline caching of the app shell and static assets.
- **FR-053**: System MUST support optional push notifications for sync completion and important alerts, configurable by admin.

**Landing Page**
- **FR-054**: System MUST provide a public landing page (no authentication required) describing the platform's features in Arabic and English.
- **FR-055**: System MUST display a prominent floating action button (FAB) for "Contact Us" that initiates a WhatsApp message or phone call to +966543620486.
- **FR-056**: System MUST provide a "Login" button on the landing page that navigates to the authentication page. There must be no "Sign Up" option.

**Dashboard & Reports**
- **FR-057**: System MUST provide an admin dashboard showing: total buildings, total apartments, occupancy rate, total revenue (current month and year), total expenses, outstanding receivables, and recent activity log.
- **FR-058**: System MUST provide the following reports: occupancy report, revenue report by building/period, expense report by category/building/period, tenant aging report (overdue invoices by aging bucket), and VAT report for ZATCA filing.

**Bilingual Support**
- **FR-059**: System MUST default to Arabic language with full RTL layout.
- **FR-060**: System MUST allow users to switch between Arabic and English at any time.
- **FR-061**: System MUST display dates in both Hijri and Gregorian formats where appropriate.
- **FR-062**: System MUST use Arabic-Indic numerals in Arabic mode and Western numerals in English mode.
- **FR-063**: System MUST display currency as Saudi Riyal (ر.س in Arabic, SAR in English).
- **FR-064**: System MUST support dual-language input (Arabic + English) for all data entry fields that appear on invoices or official documents.

**Audit & Compliance**
- **FR-065**: System MUST log every significant action (create, update, cancel, status change, permission change) with the acting user, timestamp, and details.
- **FR-066**: System MUST make all financial records (invoices, journal entries) immutable once finalized — modification only through credit notes and reversal entries.
- **FR-067**: System MUST maintain credit notes that reference their original invoice numbers.

**Performance**
- **FR-068**: System MUST be interactive within 3 seconds on a standard 4G connection after initial load.
- **FR-069**: System MUST support up to 20 concurrent users per company instance without performance degradation.

### Key Entities

- **Company**: The property management company. Contains bilingual name, logo, CR number, VAT number, structured bilingual address, and contact details. One company per platform instance.
- **User**: A person who operates the system. Has username, bilingual full name, contact info, role (Admin/User), activation status, and a set of feature permissions. Created exclusively by admin.
- **Building**: A physical property managed by the company. Has bilingual name, address, floor count, description, and status. Contains multiple apartments.
- **Apartment**: A rentable unit within a building. Has unit number, floor, rooms, area, monthly rent, status (vacant/occupied/under maintenance), and description. Linked to at most one active customer lease at a time.
- **Customer (Tenant)**: A person renting an apartment. Has bilingual name, national ID/Iqama, contact details, nationality, ID expiry, and notes. Linked to an apartment via a lease with start and end dates.
- **Invoice**: A financial document for rent or services. Has sequential number, date/time, supply date, customer, apartment, rental period, line items, VAT calculation, status, QR code data, and references to credit/debit notes. Immutable once finalized.
- **Credit Note**: A document reversing or amending an invoice. References the original invoice, contains its own QR code. Generated for cancellations and updates.
- **Expense**: A company expenditure record. Has date, category, amount, VAT, description, optional building/apartment link, and receipt attachment.
- **Journal Entry**: A double-entry accounting record. Has date, description, reference (invoice/expense/manual), and multiple debit/credit lines that must balance. Can be auto-generated or manually created.
- **Account (Chart of Accounts)**: A ledger account in the double-entry system. Categorized as Asset, Liability, Revenue, Expense, or Equity. Numbered per Saudi conventions. Admin can add sub-accounts.
- **Audit Log**: A record of every significant system action. Contains acting user, timestamp, action type, entity affected, and details. Immutable.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can create a complete ZATCA-compliant invoice (with QR code, VAT calculation, and automatic journal entry) in under 2 minutes from selecting the customer.
- **SC-002**: The platform supports at least 50 buildings and 2,000 apartments without noticeable performance degradation for any user operation.
- **SC-003**: 100% of invoices generated include valid ZATCA Phase 1 QR codes encoding all required TLV fields (seller name, VAT number, timestamp, total with VAT, VAT amount).
- **SC-004**: All offline-created data (invoices, expenses, customers, journal entries) syncs successfully within 30 seconds of connectivity restoration.
- **SC-005**: Every financial transaction (invoice creation, payment, cancellation, update, expense) produces a correct, balanced double-entry journal entry with zero manual intervention.
- **SC-006**: Users can perform all core operations (create invoices, record expenses, manage customers) with zero internet connectivity after the initial application load.
- **SC-007**: The application loads and becomes interactive within 3 seconds on a standard 4G mobile connection.
- **SC-008**: Admin can onboard a new user (create account, set permissions) in under 1 minute.
- **SC-009**: The VAT report accurately reflects all invoiced VAT collected and expense VAT paid for any specified period, matching the sum of individual transaction records.
- **SC-010**: All interface elements, forms, documents, and reports render correctly in both Arabic (RTL) and English (LTR) modes, with proper numeral formatting and Hijri/Gregorian date display.
- **SC-011**: Sequential invoice numbering maintains a gap-free sequence across all operations, including cancellations and offline creation.
- **SC-012**: No financial record (invoice, journal entry) can be physically deleted — only cancelled via credit notes with full audit trail.

### Technical Constraints

- **TC-001**: Frontend framework: Next.js (React-based) with TypeScript.
- **TC-002**: Backend services: Firebase (direct client-to-Firebase connection — no intermediate API server). Services used: Firestore (database), Firebase Authentication (auth), Firebase Storage (file uploads/receipts).
- **TC-003**: Offline data persistence: Firestore offline persistence (built-in) for automatic local caching and sync.
- **TC-004**: QR code generation: Client-side JavaScript library (no server dependency).
- **TC-005**: Deployment: Firebase Hosting with built-in Next.js web framework support, automatic SSL, and CDN distribution. All infrastructure unified under a single Firebase project.

### Security Requirements

- **SR-001**: All data in transit MUST be encrypted via HTTPS (enforced by Firebase by default).
- **SR-002**: All data at rest MUST be encrypted (enforced by Firebase/Firestore by default).
- **SR-003**: Firestore Security Rules MUST enforce role-based access control, ensuring users can only read/write documents permitted by their role and feature permissions.
- **SR-004**: Firebase Authentication MUST be used for all user authentication; passwords MUST be hashed by Firebase Auth (never stored in Firestore).
- **SR-005**: Firestore Security Rules MUST prevent non-admin users from accessing user management and company profile documents.

## Assumptions

- **A-001**: Each platform instance serves a single company. Multi-tenancy (multiple companies on one instance) is not in scope.
- **A-002**: The Saudi VAT rate defaults to 15% but is admin-configurable for future rate changes. Historical invoices always retain the rate at which they were created.
- **A-003**: The platform targets modern browsers (Chrome, Safari, Edge, Firefox — latest two versions) and Android/iOS devices for PWA installation.
- **A-004**: The initial admin account is provisioned during platform deployment (not through a self-service flow).
- **A-005**: Session timeout for inactive users defaults to 30 minutes, configurable by admin.
- **A-006**: Password requirements follow standard security practices: minimum 8 characters, at least one uppercase, one lowercase, one number, and one special character.
- **A-007**: Receipt/attachment uploads for expenses are limited to common image formats (JPEG, PNG) and PDF, with a maximum file size of 10 MB per attachment.
- **A-008**: The "Contact Us" phone number (+966543620486) is static and configured at deployment; it is not admin-editable through the platform.
- **A-009**: Hijri date conversion uses the Umm al-Qura calendar, the official calendar of Saudi Arabia.
- **A-010**: The aging report uses standard buckets: Current, 1-30 days, 31-60 days, 61-90 days, 90+ days overdue.
- **A-011**: Offline sequential invoice numbers use a device-specific temporary prefix that is resolved to the final gap-free sequence during sync.
