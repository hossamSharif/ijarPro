# Firestore Operations Contract

**Branch**: `001-ijar-pro-platform` | **Date**: 2026-02-08

> Ijar Pro uses direct client-to-Firestore SDK calls (no REST API). This document defines typed Firestore operation contracts for each entity, including collection paths, query patterns, and write operations.

## Conventions

- All operations use typed Firestore converters (TypeScript interfaces from `lib/types/models.ts`)
- All writes include `createdAt`/`updatedAt` server timestamps and `createdBy`/`updatedBy` UIDs
- All timestamps use `Timestamp.now()` on client (resolved by Firestore on sync)
- Collection references use `collection(db, 'collectionName').withConverter(converter)`

---

## Company Profile

### Read Company Profile
```
Path: company/profile
Operation: getDoc(doc(db, 'company', 'profile'))
Auth: Any authenticated user (needed for invoice headers)
Returns: Company | null
Cache: Aggressive — data rarely changes
```

### Update Company Profile
```
Path: company/profile
Operation: setDoc(doc(db, 'company', 'profile'), data, { merge: true })
Auth: Admin only
Validation: Zod schema — all required fields present, vatNumber is 15 digits
Side effects: Audit log entry
```

---

## Users

### List Users
```
Path: users
Operation: getDocs(query(collection(db, 'users'), orderBy('nameAr')))
Auth: Admin only
Returns: User[]
```

### Get User by UID
```
Path: users/{uid}
Operation: getDoc(doc(db, 'users', uid))
Auth: Admin, or own UID
Returns: User | null
```

### Create User
```
Path: users/{uid}
Operation: setDoc(doc(db, 'users', uid), userData)
Auth: Admin only
Precondition: Firebase Auth user created first (via Admin SDK or Cloud Function)
Validation: username unique (query check), email valid, role in ["admin", "user"]
Default permissions: { canCreateInvoice: true, canAddExpense: true, canChangeOwnPassword: true, ...rest: false }
Side effects: Audit log entry
```

### Update User Permissions
```
Path: users/{uid}
Operation: updateDoc(doc(db, 'users', uid), { permissions: newPermissions, updatedAt, updatedBy })
Auth: Admin only
Validation: All permission keys are valid booleans
Side effects: Audit log entry, client notified to refresh token
```

### Deactivate User
```
Path: users/{uid}
Operation: updateDoc(doc(db, 'users', uid), { isActive: false, updatedAt, updatedBy })
Auth: Admin only
Side effects: Firebase Auth account disabled (via Cloud Function or API route), audit log entry
```

---

## Buildings

### List Buildings (Active)
```
Path: buildings
Operation: getDocs(query(collection(db, 'buildings'), where('status', '==', 'active'), orderBy('nameAr')))
Auth: Any authenticated user
Returns: Building[]
```

### Get Building
```
Path: buildings/{buildingId}
Operation: getDoc(doc(db, 'buildings', buildingId))
Auth: Any authenticated user
Returns: Building | null
```

### Create Building
```
Path: buildings/{auto-id}
Operation: addDoc(collection(db, 'buildings'), buildingData)
Auth: Admin or canManageBuildings
Validation: nameAr, nameEn required; floors > 0
Initial state: status = "active", all counts = 0
Side effects: Audit log entry
```

### Update Building
```
Path: buildings/{buildingId}
Operation: updateDoc(doc(db, 'buildings', buildingId), updates)
Auth: Admin or canManageBuildings
Validation: Cannot deactivate if occupied apartments exist (client-side check + warning)
Side effects: Audit log entry
```

---

## Apartments

### List Apartments by Building
```
Path: apartments
Operation: getDocs(query(collection(db, 'apartments'), where('buildingId', '==', id), orderBy('unitNumber')))
Auth: Any authenticated user
Index: (buildingId, unitNumber)
Returns: Apartment[]
```

### Occupancy Overview
```
Path: buildings
Operation: getDocs(query(collection(db, 'buildings'), where('status', '==', 'active')))
Auth: Any authenticated user
Returns: Building[] with denormalized counts (occupiedCount, vacantCount, maintenanceCount)
Note: No need to query apartments — counts are denormalized on building documents
```

### Create Apartment
```
Path: apartments/{auto-id}
Operation: Batched write — addDoc apartment + updateDoc building (increment apartmentCount, vacantCount)
Auth: Admin or canManageBuildings
Validation: unitNumber unique within building (query check), floor <= building.floors
Initial state: status = "vacant"
Side effects: Audit log entry, building counts updated
```

### Link Customer to Apartment
```
Path: apartments/{apartmentId}, customers/{customerId}
Operation: Batched write:
  1. updateDoc apartment: { status: "occupied", currentCustomerId, leaseStart, leaseEnd }
  2. updateDoc customer: { currentApartmentId, currentBuildingId }
  3. updateDoc building: { occupiedCount: increment(1), vacantCount: increment(-1) }
Auth: Admin or canManageCustomers
Precondition: Apartment status is "vacant", customer has no active apartment
Side effects: Audit log entry
```

### Unlink Customer from Apartment
```
Path: apartments/{apartmentId}, customers/{customerId}
Operation: Batched write:
  1. updateDoc apartment: { status: "vacant", currentCustomerId: deleteField(), leaseStart: deleteField(), leaseEnd: deleteField() }
  2. updateDoc customer: { currentApartmentId: deleteField(), currentBuildingId: deleteField() }
  3. updateDoc building: { occupiedCount: increment(-1), vacantCount: increment(1) }
Auth: Admin or canManageCustomers
Side effects: Audit log entry
```

---

## Customers

### List Customers (Active)
```
Path: customers
Operation: getDocs(query(collection(db, 'customers'), where('isActive', '==', true), orderBy('nameAr')))
Auth: Any authenticated user
Returns: Customer[]
```

### Search Customer by National ID
```
Path: customers
Operation: getDocs(query(collection(db, 'customers'), where('nationalId', '==', id)))
Auth: Any authenticated user
Returns: Customer[] (0 or 1 result — used for uniqueness check)
```

### Create Customer
```
Path: customers/{auto-id}
Operation: addDoc(collection(db, 'customers'), customerData)
Auth: Admin or canManageCustomers
Precondition: nationalId unique (query check)
Validation: nationalId 10 digits, phone E.164, idExpiry is valid date
Initial state: isActive = true
Side effects: Audit log entry
```

### Customer Invoice History
```
Path: invoices
Operation: getDocs(query(collection(db, 'invoices'), where('customerId', '==', id), orderBy('createdAt', 'desc')))
Auth: Any authenticated user
Index: (customerId, createdAt)
Returns: Invoice[]
```

---

## Invoices

### List Invoices (with filters)
```
Path: invoices
Operations:
  - By status: query(collection, where('status', '==', status), orderBy('createdAt', 'desc'))
  - By customer: query(collection, where('customerId', '==', id), orderBy('createdAt', 'desc'))
  - By apartment: query(collection, where('apartmentId', '==', id), orderBy('createdAt', 'desc'))
  - By building: query(collection, where('buildingId', '==', id), orderBy('createdAt', 'desc'))
Auth: Any authenticated user
Indexes: (status, createdAt), (customerId, createdAt), (apartmentId, createdAt), (buildingId, createdAt)
```

### Create Invoice
```
Path: invoices/{auto-id}
Operation: Batched write:
  1. Transaction on counters/invoices: read → increment → get next number
  2. addDoc invoice with assigned number
  3. addDoc journalEntry (debit AR, credit Revenue + VAT Payable)
  4. addDoc auditLog
Auth: canCreateInvoice
Validation: Customer linked to apartment, all required fields present, VAT calculated correctly
ZATCA: Generate TLV Base64 QR data client-side, store in zatcaQrData field
Offline: Use temporary "OFFLINE-{deviceId}-{seq}" ID, resolve on sync
Side effects: Journal entry, audit log
```

### Update Invoice (creates credit note + new debit note)
```
Path: invoices/{newId}, invoices/{creditNoteId}
Precondition: Original invoice status is "draft" or "issued"
Operation: Batched write:
  1. addDoc credit note (type: "credit", referencing original)
  2. addDoc new invoice (type: "debit", with updated amounts)
  3. updateDoc original invoice: { status: "cancelled", cancellationReason: "Updated — see INV-XXXX" }
  4. addDoc reversal journal entry
  5. addDoc new journal entry
  6. addDoc auditLog entries
Auth: canUpdateInvoice
Side effects: 2 journal entries, audit log
```

### Cancel Invoice
```
Path: invoices/{invoiceId}, invoices/{creditNoteId}
Precondition: Invoice status not "paid" or "cancelled"
Operation: Batched write:
  1. addDoc credit note (type: "credit", referencing original, with cancellation reason)
  2. updateDoc original: { status: "cancelled", cancellationReason }
  3. addDoc reversal journal entry
  4. addDoc auditLog
Auth: canCancelInvoice
Side effects: Journal entry, audit log
```

### Record Payment
```
Path: invoices/{invoiceId}
Precondition: Invoice status is "issued", "partially_paid", or "overdue"
Operation: Batched write:
  1. updateDoc invoice: { paymentAmount: increment(amount), paymentDate, status: newStatus }
  2. addDoc journal entry (debit Cash/Bank, credit AR)
  3. addDoc auditLog
Auth: canRecordPayment
Status logic: if paymentAmount >= total → "paid", else → "partially_paid"
Side effects: Journal entry, audit log
```

---

## Expenses

### List Expenses (with filters)
```
Path: expenses
Operations:
  - By category: query(collection, where('category', '==', cat), orderBy('date', 'desc'))
  - By building: query(collection, where('buildingId', '==', id), orderBy('date', 'desc'))
  - By date range: query(collection, where('date', '>=', start), where('date', '<=', end), orderBy('date', 'desc'))
Auth: Any authenticated user
Indexes: (category, date), (buildingId, date)
```

### Create Expense
```
Path: expenses/{auto-id}
Operation: Batched write:
  1. addDoc expense
  2. addDoc journal entry (debit Expense Account, credit Cash/Bank)
  3. addDoc auditLog
Auth: canAddExpense
Validation: category in company.expenseCategories, amount > 0
File upload: Receipt uploaded to Firebase Storage first, URL stored in receiptUrl
Side effects: Journal entry, audit log
```

---

## Journal Entries

### List Journal Entries (with filters)
```
Path: journalEntries
Operations:
  - By type: query(collection, where('entryType', '==', type), orderBy('date', 'desc'))
  - By date range: query(collection, where('date', '>=', start), where('date', '<=', end), orderBy('date', 'desc'))
Auth: Admin or canViewJournal
Indexes: (entryType, date), (referenceId, date)
```

### Create Manual Journal Entry
```
Path: journalEntries/{auto-id}
Operation: addDoc(collection(db, 'journalEntries'), entryData)
Auth: canCreateManualEntry
Validation: totalDebits === totalCredits (enforced client-side and Security Rules), min 2 lines
Side effects: Audit log entry
```

---

## Audit Log

### List Audit Log
```
Path: auditLog
Operation: getDocs(query(collection(db, 'auditLog'), orderBy('timestamp', 'desc'), limit(100)))
Auth: Admin or canViewReports
Returns: AuditLog[]
```

### Create Audit Log Entry
```
Path: auditLog/{auto-id}
Operation: addDoc(collection(db, 'auditLog'), logData)
Auth: Any authenticated user (system writes on behalf of user)
Immutability: No update, no delete — enforced by Security Rules
```

---

## Real-time Listeners

### Active Listeners (always subscribed in dashboard layout)
```
1. onSnapshot(doc(db, 'users', currentUid)) — permission changes, account status
2. onSnapshot(query(collection(db, 'buildings'), where('status', '==', 'active'))) — building list with counts
3. Sync status via snapshot.metadata.hasPendingWrites / fromCache
```

### Page-specific Listeners
```
- Invoice list page: onSnapshot with status filter
- Customer detail: onSnapshot on customer doc + invoice query
- Journal page: onSnapshot with date/type filters
- Dashboard: Aggregation queries for metrics
```
