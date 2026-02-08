# Firestore Security Rules Contract

**Branch**: `001-ijar-pro-platform` | **Date**: 2026-02-08

## Rules Architecture

All rules are defined in `firebase/firestore.rules` and deployed via `firebase deploy --only firestore:rules`.

## Helper Functions

```
function isAuthenticated() → request.auth != null
function isAdmin() → request.auth.token.role == "admin"
function isOwner(uid) → request.auth.uid == uid
function userPermissions() → get(/databases/$(database)/documents/users/$(request.auth.uid)).data.permissions
function hasPermission(perm) → isAdmin() || (userPermissions()[perm] == true)
function isActiveUser() → get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isActive == true
```

## Collection Rules

### company/profile
```
read:   isAuthenticated() && isActiveUser()
write:  isAdmin()
```

### users/{uid}
```
read:   isAdmin() || isOwner(uid)
create: isAdmin()
update: isAdmin() || (isOwner(uid) && onlyUpdating(['updatedAt']))
delete: false  (never delete users)
```

### buildings/{buildingId}
```
read:   isAuthenticated() && isActiveUser()
create: hasPermission('canManageBuildings')
update: hasPermission('canManageBuildings')
delete: false
```

### apartments/{apartmentId}
```
read:   isAuthenticated() && isActiveUser()
create: hasPermission('canManageBuildings')
update: hasPermission('canManageBuildings') || hasPermission('canManageCustomers')
delete: false
```

### customers/{customerId}
```
read:   isAuthenticated() && isActiveUser()
create: hasPermission('canManageCustomers')
update: hasPermission('canManageCustomers')
delete: false
```

### invoices/{invoiceId}
```
read:   isAuthenticated() && isActiveUser()
create: hasPermission('canCreateInvoice')
update: invoiceUpdateAllowed()
delete: false  (NEVER delete invoices — ZATCA compliance)
```

**invoiceUpdateAllowed()**: Only specific status transitions by authorized users:
- Status to "cancelled": `hasPermission('canCancelInvoice')`
- Payment recording: `hasPermission('canRecordPayment')`
- Status transitions only (no field modification on finalized invoices)

### expenses/{expenseId}
```
read:   isAuthenticated() && isActiveUser()
create: hasPermission('canAddExpense')
update: isAdmin()
delete: false
```

### journalEntries/{entryId}
```
read:   hasPermission('canViewJournal')
create: isAuthenticated() && isActiveUser() && balanceValid()
update: false  (IMMUTABLE — corrections via reversal entries only)
delete: false  (IMMUTABLE)
```

**balanceValid()**: `request.resource.data.totalDebits == request.resource.data.totalCredits`

### accounts/{accountId}
```
read:   hasPermission('canViewJournal')
create: isAdmin()
update: isAdmin() && !resource.data.isSystem  (cannot modify system accounts)
delete: false
```

### counters/{counterId}
```
read:   isAuthenticated() && isActiveUser()
write:  isAuthenticated() && isActiveUser()
```

### auditLog/{logId}
```
read:   isAdmin() || hasPermission('canViewReports')
create: isAuthenticated() && isActiveUser()
update: false  (APPEND-ONLY)
delete: false  (APPEND-ONLY)
```

## Composite Indexes

Defined in `firebase/firestore.indexes.json`:

```json
{
  "indexes": [
    { "collectionGroup": "invoices", "fields": [
      { "fieldPath": "status", "order": "ASCENDING" },
      { "fieldPath": "createdAt", "order": "DESCENDING" }
    ]},
    { "collectionGroup": "invoices", "fields": [
      { "fieldPath": "customerId", "order": "ASCENDING" },
      { "fieldPath": "createdAt", "order": "DESCENDING" }
    ]},
    { "collectionGroup": "invoices", "fields": [
      { "fieldPath": "apartmentId", "order": "ASCENDING" },
      { "fieldPath": "createdAt", "order": "DESCENDING" }
    ]},
    { "collectionGroup": "invoices", "fields": [
      { "fieldPath": "buildingId", "order": "ASCENDING" },
      { "fieldPath": "createdAt", "order": "DESCENDING" }
    ]},
    { "collectionGroup": "invoices", "fields": [
      { "fieldPath": "type", "order": "ASCENDING" },
      { "fieldPath": "createdAt", "order": "DESCENDING" }
    ]},
    { "collectionGroup": "journalEntries", "fields": [
      { "fieldPath": "entryType", "order": "ASCENDING" },
      { "fieldPath": "date", "order": "DESCENDING" }
    ]},
    { "collectionGroup": "journalEntries", "fields": [
      { "fieldPath": "referenceId", "order": "ASCENDING" },
      { "fieldPath": "date", "order": "DESCENDING" }
    ]},
    { "collectionGroup": "expenses", "fields": [
      { "fieldPath": "category", "order": "ASCENDING" },
      { "fieldPath": "date", "order": "DESCENDING" }
    ]},
    { "collectionGroup": "expenses", "fields": [
      { "fieldPath": "buildingId", "order": "ASCENDING" },
      { "fieldPath": "date", "order": "DESCENDING" }
    ]},
    { "collectionGroup": "apartments", "fields": [
      { "fieldPath": "buildingId", "order": "ASCENDING" },
      { "fieldPath": "status", "order": "ASCENDING" }
    ]},
    { "collectionGroup": "apartments", "fields": [
      { "fieldPath": "buildingId", "order": "ASCENDING" },
      { "fieldPath": "unitNumber", "order": "ASCENDING" }
    ]}
  ],
  "fieldOverrides": []
}
```

## Security Rules Performance Notes

- `get()` calls cost 1 billable read each, even if the rule denies access
- `isActiveUser()` and `userPermissions()` each call `get()` — optimize by placing cheaper checks first (e.g., `isAuthenticated()`)
- Maximum 10 `get()`/`exists()` calls per single-document request, 20 per multi-document
- `isAdmin()` uses custom claims (free, nanosecond evaluation) — always check before Firestore-based permissions
