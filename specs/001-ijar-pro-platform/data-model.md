# Data Model: Ijar Pro Platform

**Branch**: `001-ijar-pro-platform` | **Date**: 2026-02-08

## Overview

All data resides in **Cloud Firestore** as top-level collections (no nested subcollections for core entities). This keeps queries flat, offline-sync friendly, and compatible with Firestore Security Rules.

Every document includes standard metadata fields:
- `createdAt: Timestamp` — server timestamp on creation
- `createdBy: string` — UID of the creating user
- `updatedAt: Timestamp` — server timestamp on last update
- `updatedBy: string` — UID of the last updating user

---

## Collections

### 1. `company` (single document: `company/profile`)

The company profile. One document per platform instance.

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `nameAr` | `string` | Yes | min 2, max 200 | Company name in Arabic |
| `nameEn` | `string` | Yes | min 2, max 200 | Company name in English |
| `logoUrl` | `string` | No | valid URL | Firebase Storage URL for company logo |
| `crNumber` | `string` | Yes | numeric string | Commercial Registration number |
| `vatNumber` | `string` | Yes | 15-digit numeric | VAT Registration Number |
| `address` | `Address` | Yes | — | Structured bilingual address |
| `phone` | `string` | Yes | E.164 format | Contact phone |
| `email` | `string` | No | valid email | Contact email |
| `website` | `string` | No | valid URL | Company website |
| `vatRate` | `number` | Yes | 0–100 | Current VAT rate (default 15) |
| `sessionTimeout` | `number` | Yes | min 5 | Session timeout in minutes (default 30) |
| `expenseCategories` | `string[]` | Yes | non-empty | Active expense categories |

**Address** (embedded object):
| Field | Type | Required |
|-------|------|----------|
| `streetAr` | `string` | Yes |
| `streetEn` | `string` | Yes |
| `cityAr` | `string` | Yes |
| `cityEn` | `string` | Yes |
| `districtAr` | `string` | Yes |
| `districtEn` | `string` | Yes |
| `postalCode` | `string` | Yes |
| `additionalNumber` | `string` | No |

**Security**: Admin-only read/write. Non-admin users can read (needed for invoice headers).

---

### 2. `users/{uid}`

User accounts. UID matches Firebase Auth UID.

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `username` | `string` | Yes | unique, 3-50 chars | Login username |
| `nameAr` | `string` | Yes | min 2, max 100 | Full name in Arabic |
| `nameEn` | `string` | Yes | min 2, max 100 | Full name in English |
| `email` | `string` | Yes | valid email | User email |
| `phone` | `string` | No | E.164 format | User phone |
| `role` | `string` | Yes | `"admin"` \| `"user"` | User role (mirrors custom claim) |
| `isActive` | `boolean` | Yes | — | Account active status |
| `permissions` | `Permissions` | Yes | — | Feature permission flags |
| `createdAt` | `Timestamp` | Yes | — | Account creation time |
| `createdBy` | `string` | Yes | — | UID of admin who created |
| `updatedAt` | `Timestamp` | Yes | — | Last update time |
| `updatedBy` | `string` | Yes | — | UID of last updater |

**Permissions** (embedded object):
| Field | Type | Default (new user) | Description |
|-------|------|-------------------|-------------|
| `canCreateInvoice` | `boolean` | `true` | Create new invoices |
| `canUpdateInvoice` | `boolean` | `false` | Update/modify invoices |
| `canCancelInvoice` | `boolean` | `false` | Cancel invoices |
| `canRecordPayment` | `boolean` | `false` | Record invoice payments |
| `canManageBuildings` | `boolean` | `false` | Add/edit buildings & apartments |
| `canManageCustomers` | `boolean` | `false` | Add/edit customers |
| `canAddExpense` | `boolean` | `true` | Record expenses |
| `canViewJournal` | `boolean` | `false` | View accounting journal |
| `canCreateManualEntry` | `boolean` | `false` | Create manual journal entries |
| `canViewReports` | `boolean` | `false` | Access dashboard & reports |
| `canChangeOwnPassword` | `boolean` | `true` | Change own password |

**Security**: Admin CRUD. Users can read own document only.

---

### 3. `buildings/{buildingId}`

Physical properties managed by the company.

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `nameAr` | `string` | Yes | min 2, max 200 | Building name in Arabic |
| `nameEn` | `string` | Yes | min 2, max 200 | Building name in English |
| `address` | `string` | Yes | min 5, max 500 | Building address |
| `floors` | `number` | Yes | min 1, max 200 | Number of floors |
| `description` | `string` | No | max 1000 | Building description |
| `status` | `string` | Yes | `"active"` \| `"inactive"` | Building status |
| `apartmentCount` | `number` | Yes | min 0 | Denormalized apartment count |
| `occupiedCount` | `number` | Yes | min 0 | Denormalized occupied count |
| `vacantCount` | `number` | Yes | min 0 | Denormalized vacant count |
| `maintenanceCount` | `number` | Yes | min 0 | Denormalized under-maintenance count |

**Security**: Admin or users with `canManageBuildings`. All authenticated users can read.

---

### 4. `apartments/{apartmentId}`

Rentable units within buildings.

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `buildingId` | `string` | Yes | valid building ref | Parent building ID |
| `unitNumber` | `string` | Yes | min 1, max 20 | Unit/apartment number |
| `floor` | `number` | Yes | min 0 | Floor number (0 = ground) |
| `rooms` | `number` | Yes | min 1 | Number of rooms |
| `areaSqm` | `number` | Yes | min 1 | Area in square meters |
| `monthlyRent` | `number` | Yes | min 0 | Monthly rent in SAR |
| `status` | `string` | Yes | see states | Current occupancy status |
| `description` | `string` | No | max 1000 | Apartment description |
| `currentCustomerId` | `string` | No | valid customer ref | Currently linked customer |
| `leaseStart` | `Timestamp` | No | — | Current lease start date |
| `leaseEnd` | `Timestamp` | No | — | Current lease end date |

**State Machine**:
```
vacant ──→ occupied       (customer linked)
occupied ──→ vacant       (lease ended / customer unlinked)
vacant ──→ under_maintenance
occupied ──→ under_maintenance
under_maintenance ──→ vacant
```

**Indexes**: `(buildingId, status)`, `(buildingId, unitNumber)`

**Security**: Admin or users with `canManageBuildings`. All authenticated users can read.

---

### 5. `customers/{customerId}`

Tenants / customers.

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `nameAr` | `string` | Yes | min 2, max 200 | Full name in Arabic |
| `nameEn` | `string` | Yes | min 2, max 200 | Full name in English |
| `nationalId` | `string` | Yes | **unique**, 10-digit | National ID or Iqama number |
| `phone` | `string` | Yes | E.164 format | Phone number |
| `email` | `string` | No | valid email | Email address |
| `nationality` | `string` | Yes | min 2, max 100 | Nationality |
| `idExpiry` | `Timestamp` | Yes | — | ID/Iqama expiry date |
| `notes` | `string` | No | max 2000 | Notes |
| `isActive` | `boolean` | Yes | — | Active/deactivated status |
| `currentApartmentId` | `string` | No | valid apartment ref | Currently linked apartment |
| `currentBuildingId` | `string` | No | valid building ref | Building of current apartment |

**Uniqueness**: `nationalId` must be unique across all customers (including deactivated). Enforced by client-side check + Firestore Security Rules query.

**Security**: Admin or users with `canManageCustomers`. All authenticated users can read.

---

### 6. `invoices/{invoiceId}`

Financial documents for rent and services.

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `invoiceNumber` | `string` | Yes | sequential, unique | Display invoice number (e.g., "INV-0001") |
| `tempId` | `string` | No | — | Temporary offline ID (e.g., "OFFLINE-dev1-3") |
| `type` | `string` | Yes | `"debit"` \| `"credit"` | Invoice or credit note |
| `status` | `string` | Yes | see states | Current invoice status |
| `customerId` | `string` | Yes | valid customer ref | Customer ID |
| `customerNameAr` | `string` | Yes | — | Denormalized customer Arabic name |
| `customerNameEn` | `string` | Yes | — | Denormalized customer English name |
| `apartmentId` | `string` | Yes | valid apartment ref | Apartment ID |
| `buildingId` | `string` | Yes | valid building ref | Building ID |
| `buildingNameAr` | `string` | Yes | — | Denormalized building Arabic name |
| `apartmentUnit` | `string` | Yes | — | Denormalized unit number |
| `invoiceDate` | `Timestamp` | Yes | UTC+3 | Invoice creation date/time |
| `supplyDate` | `Timestamp` | Yes | — | Supply date |
| `rentalPeriodStart` | `Timestamp` | Yes | — | Rental period start |
| `rentalPeriodEnd` | `Timestamp` | Yes | — | Rental period end |
| `lineItems` | `LineItem[]` | Yes | min 1 | Invoice line items |
| `subtotal` | `number` | Yes | min 0 | Total before VAT |
| `vatRate` | `number` | Yes | 0–100 | VAT rate at time of creation |
| `vatAmount` | `number` | Yes | min 0 | VAT amount |
| `total` | `number` | Yes | min 0 | Total with VAT |
| `zatcaQrData` | `string` | Yes | Base64 TLV | ZATCA QR code Base64 data |
| `originalInvoiceId` | `string` | No | valid invoice ref | For credit notes: original invoice |
| `originalInvoiceNumber` | `string` | No | — | For credit notes: original number |
| `cancellationReason` | `string` | No | max 500 | Reason for cancellation |
| `paymentAmount` | `number` | No | min 0 | Amount paid so far |
| `paymentDate` | `Timestamp` | No | — | Last payment date |
| `statusHistory` | `StatusChange[]` | Yes | — | Full status change log |

**LineItem** (embedded object):
| Field | Type | Required |
|-------|------|----------|
| `descriptionAr` | `string` | Yes |
| `descriptionEn` | `string` | Yes |
| `quantity` | `number` | Yes |
| `unitPrice` | `number` | Yes |
| `amount` | `number` | Yes |

**StatusChange** (embedded array):
| Field | Type | Required |
|-------|------|----------|
| `status` | `string` | Yes |
| `timestamp` | `Timestamp` | Yes |
| `userId` | `string` | Yes |
| `note` | `string` | No |

**Invoice State Machine**:
```
draft ──→ issued        (invoice finalized)
issued ──→ paid         (full payment received)
issued ──→ partially_paid (partial payment)
issued ──→ overdue      (past due date)
issued ──→ cancelled    (cancellation with credit note)
partially_paid ──→ paid (remaining payment)
partially_paid ──→ overdue
partially_paid ──→ cancelled
overdue ──→ paid
overdue ──→ cancelled
draft ──→ cancelled
```

**Immutability**: Once status leaves `draft`, the invoice document is immutable. Updates create credit note + new debit note. Cancellations create credit note. Security Rules enforce this.

**Indexes**: `(status, createdAt)`, `(customerId, createdAt)`, `(apartmentId, createdAt)`, `(buildingId, createdAt)`, `(type, createdAt)`

**Security**: Create by users with `canCreateInvoice`. Update (status transitions) by users with relevant permission. Never delete.

---

### 7. `expenses/{expenseId}`

Company expenditure records.

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `date` | `Timestamp` | Yes | — | Expense date |
| `category` | `string` | Yes | from company categories | Expense category |
| `amount` | `number` | Yes | min 0 | Expense amount |
| `vatAmount` | `number` | No | min 0 | VAT amount (optional) |
| `description` | `string` | Yes | max 1000 | Expense description |
| `buildingId` | `string` | No | valid building ref | Associated building |
| `apartmentId` | `string` | No | valid apartment ref | Associated apartment |
| `receiptUrl` | `string` | No | valid URL | Firebase Storage URL for receipt |
| `receiptFileName` | `string` | No | — | Original file name |

**Indexes**: `(category, date)`, `(buildingId, date)`

**Security**: Create by users with `canAddExpense`. Read by all authenticated. Update/delete by admin only.

---

### 8. `journalEntries/{entryId}`

Double-entry accounting records.

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `date` | `Timestamp` | Yes | — | Entry date |
| `description` | `string` | Yes | max 500 | Entry description |
| `entryType` | `string` | Yes | see enum | Type of journal entry |
| `referenceId` | `string` | No | — | ID of related invoice/expense |
| `referenceNumber` | `string` | No | — | Display number of reference |
| `buildingId` | `string` | No | — | Associated building |
| `lines` | `JournalLine[]` | Yes | min 2 | Debit/credit lines |
| `totalDebits` | `number` | Yes | — | Sum of all debits |
| `totalCredits` | `number` | Yes | — | Sum of all credits |

**Entry Types**: `"invoice_creation"`, `"invoice_payment"`, `"invoice_cancellation"`, `"invoice_update_reversal"`, `"expense"`, `"manual"`

**JournalLine** (embedded array):
| Field | Type | Required |
|-------|------|----------|
| `accountId` | `string` | Yes |
| `accountNameAr` | `string` | Yes |
| `accountNameEn` | `string` | Yes |
| `debit` | `number` | Yes (0 if credit) |
| `credit` | `number` | Yes (0 if debit) |
| `description` | `string` | No |

**Validation**: `totalDebits === totalCredits` — enforced client-side before write and in Security Rules.

**Immutability**: Journal entries are NEVER updated or deleted. Corrections via new reversal entries only.

**Indexes**: `(entryType, date)`, `(referenceId, date)`

**Security**: Auto-created entries by system. Manual entries by users with `canCreateManualEntry`. View by users with `canViewJournal`. Never update/delete.

---

### 9. `accounts/{accountId}`

Chart of Accounts — ledger accounts for double-entry system.

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `code` | `string` | Yes | unique, numeric | Account code (e.g., "1100") |
| `nameAr` | `string` | Yes | min 2, max 200 | Account name in Arabic |
| `nameEn` | `string` | Yes | min 2, max 200 | Account name in English |
| `type` | `string` | Yes | see enum | Account type |
| `parentCode` | `string` | No | valid account code | Parent account code |
| `isSystem` | `boolean` | Yes | — | System-defined (cannot delete) |
| `isActive` | `boolean` | Yes | — | Active status |
| `level` | `number` | Yes | 1-4 | Account hierarchy level |

**Account Types**: `"asset"`, `"liability"`, `"equity"`, `"revenue"`, `"expense"`

**Predefined Chart (Saudi conventions)**:
```
1000  Assets
├── 1100  Cash and Bank
├── 1200  Accounts Receivable
└── 1300  Prepaid Expenses

2000  Liabilities
├── 2100  Accounts Payable
├── 2200  VAT Payable
└── 2300  Accrued Expenses

3000  Equity
├── 3100  Owner's Equity
└── 3200  Retained Earnings

4000  Revenue
├── 4100  Rental Revenue
└── 4200  Other Revenue

5000  Expenses
├── 5100  Maintenance Expenses
├── 5200  Utility Expenses
├── 5300  Salary Expenses
├── 5400  Supply Expenses
└── 5900  Other Expenses
```

**Security**: Read by users with `canViewJournal`. Admin can add custom sub-accounts. System accounts cannot be modified.

---

### 10. `counters/{counterId}`

Sequential number counters.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `currentValue` | `number` | Yes | Current counter value |
| `prefix` | `string` | Yes | Number prefix (e.g., "INV-") |
| `padding` | `number` | Yes | Zero-padding length (e.g., 4 → "0001") |

**Documents**: `counters/invoices`, `counters/creditNotes`

**Access Pattern**: Firestore transaction to read + increment atomically (online only). Offline uses temporary prefix.

**Security**: Read/write by authenticated users (transactional access).

---

### 11. `auditLog/{logId}`

Immutable audit trail.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `timestamp` | `Timestamp` | Yes | Action timestamp (UTC+3) |
| `userId` | `string` | Yes | Acting user UID |
| `userName` | `string` | Yes | Acting user display name |
| `action` | `string` | Yes | Action type (see enum) |
| `entityType` | `string` | Yes | Entity collection name |
| `entityId` | `string` | Yes | Affected document ID |
| `details` | `object` | No | Before/after state summary |
| `syncConflict` | `boolean` | No | Whether this was a sync conflict |

**Action Types**: `"create"`, `"update"`, `"cancel"`, `"status_change"`, `"permission_change"`, `"account_activate"`, `"account_deactivate"`, `"payment"`, `"sync_conflict"`

**Immutability**: Append-only. No user (including admin) can update or delete audit log entries.

**Security**: Create by any authenticated user. Read by admin or users with `canViewReports`. Never update/delete.

---

## Relationships

```
company (1) ─── uses ──── users (many)
building (1) ─── contains ──── apartments (many)
customer (1) ─── linked to ──── apartment (0..1)  [active lease]
customer (1) ─── has ──── invoices (many)
apartment (1) ─── has ──── invoices (many)
invoice (1) ─── generates ──── journalEntries (1+)
invoice (1) ─── may have ──── creditNote invoices (0+)
expense (1) ─── generates ──── journalEntry (1)
journalEntry (many) ─── references ──── accounts (many)
all entities ──── logged in ──── auditLog
```

## Denormalization Strategy

To minimize Firestore reads and support offline queries:

1. **Apartment occupancy counts** denormalized on `buildings` documents — updated atomically when apartment status changes
2. **Customer/building names** denormalized on `invoices` — snapshot at invoice creation time (invoices are immutable)
3. **Account names** denormalized on `journalEntry.lines` — snapshot at entry creation time
4. **Current customer** denormalized on `apartments` — updated when lease linked/unlinked
