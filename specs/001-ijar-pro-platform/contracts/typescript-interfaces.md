# TypeScript Interface Contract

**Branch**: `001-ijar-pro-platform` | **Date**: 2026-02-08

> These interfaces define the shape of all Firestore documents and related types. They will be implemented in `lib/types/models.ts`, `lib/types/permissions.ts`, and `lib/types/accounting.ts`.

## Core Types

```typescript
// lib/types/models.ts

import { Timestamp } from 'firebase/firestore';

// === Base Types ===

interface BaseDocument {
  createdAt: Timestamp;
  createdBy: string;
  updatedAt: Timestamp;
  updatedBy: string;
}

interface BilingualName {
  nameAr: string;
  nameEn: string;
}

// === Company ===

interface Address {
  streetAr: string;
  streetEn: string;
  cityAr: string;
  cityEn: string;
  districtAr: string;
  districtEn: string;
  postalCode: string;
  additionalNumber?: string;
}

interface Company extends BaseDocument {
  nameAr: string;
  nameEn: string;
  logoUrl?: string;
  crNumber: string;
  vatNumber: string;  // 15-digit
  address: Address;
  phone: string;
  email?: string;
  website?: string;
  vatRate: number;  // default 15
  sessionTimeout: number;  // minutes, default 30
  expenseCategories: string[];
}

// === Users ===

interface UserPermissions {
  canCreateInvoice: boolean;
  canUpdateInvoice: boolean;
  canCancelInvoice: boolean;
  canRecordPayment: boolean;
  canManageBuildings: boolean;
  canManageCustomers: boolean;
  canAddExpense: boolean;
  canViewJournal: boolean;
  canCreateManualEntry: boolean;
  canViewReports: boolean;
  canChangeOwnPassword: boolean;
}

type UserRole = 'admin' | 'user';

interface User extends BaseDocument, BilingualName {
  username: string;
  email: string;
  phone?: string;
  role: UserRole;
  isActive: boolean;
  permissions: UserPermissions;
}

// === Buildings ===

type BuildingStatus = 'active' | 'inactive';

interface Building extends BaseDocument, BilingualName {
  address: string;
  floors: number;
  description?: string;
  status: BuildingStatus;
  apartmentCount: number;
  occupiedCount: number;
  vacantCount: number;
  maintenanceCount: number;
}

// === Apartments ===

type ApartmentStatus = 'vacant' | 'occupied' | 'under_maintenance';

interface Apartment extends BaseDocument {
  buildingId: string;
  unitNumber: string;
  floor: number;
  rooms: number;
  areaSqm: number;
  monthlyRent: number;
  status: ApartmentStatus;
  description?: string;
  currentCustomerId?: string;
  leaseStart?: Timestamp;
  leaseEnd?: Timestamp;
}

// === Customers ===

interface Customer extends BaseDocument, BilingualName {
  nationalId: string;  // unique, 10-digit
  phone: string;
  email?: string;
  nationality: string;
  idExpiry: Timestamp;
  notes?: string;
  isActive: boolean;
  currentApartmentId?: string;
  currentBuildingId?: string;
}

// === Invoices ===

type InvoiceType = 'debit' | 'credit';
type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled';

interface LineItem {
  descriptionAr: string;
  descriptionEn: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface StatusChange {
  status: InvoiceStatus;
  timestamp: Timestamp;
  userId: string;
  note?: string;
}

interface Invoice extends BaseDocument {
  invoiceNumber: string;
  tempId?: string;
  type: InvoiceType;
  status: InvoiceStatus;
  customerId: string;
  customerNameAr: string;
  customerNameEn: string;
  apartmentId: string;
  buildingId: string;
  buildingNameAr: string;
  apartmentUnit: string;
  invoiceDate: Timestamp;
  supplyDate: Timestamp;
  rentalPeriodStart: Timestamp;
  rentalPeriodEnd: Timestamp;
  lineItems: LineItem[];
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  zatcaQrData: string;  // Base64 TLV
  originalInvoiceId?: string;
  originalInvoiceNumber?: string;
  cancellationReason?: string;
  paymentAmount?: number;
  paymentDate?: Timestamp;
  statusHistory: StatusChange[];
}

// === Expenses ===

interface Expense extends BaseDocument {
  date: Timestamp;
  category: string;
  amount: number;
  vatAmount?: number;
  description: string;
  buildingId?: string;
  apartmentId?: string;
  receiptUrl?: string;
  receiptFileName?: string;
}

// === Counters ===

interface Counter {
  currentValue: number;
  prefix: string;
  padding: number;
}

// === Audit Log ===

type AuditAction =
  | 'create' | 'update' | 'cancel' | 'status_change'
  | 'permission_change' | 'account_activate' | 'account_deactivate'
  | 'payment' | 'sync_conflict';

interface AuditLogEntry {
  timestamp: Timestamp;
  userId: string;
  userName: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  details?: Record<string, unknown>;
  syncConflict?: boolean;
}
```

## Accounting Types

```typescript
// lib/types/accounting.ts

import { Timestamp } from 'firebase/firestore';

type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

type JournalEntryType =
  | 'invoice_creation' | 'invoice_payment' | 'invoice_cancellation'
  | 'invoice_update_reversal' | 'expense' | 'manual';

interface Account {
  code: string;
  nameAr: string;
  nameEn: string;
  type: AccountType;
  parentCode?: string;
  isSystem: boolean;
  isActive: boolean;
  level: number;  // 1-4
}

interface JournalLine {
  accountId: string;
  accountNameAr: string;
  accountNameEn: string;
  debit: number;   // 0 if credit line
  credit: number;  // 0 if debit line
  description?: string;
}

interface JournalEntry {
  date: Timestamp;
  description: string;
  entryType: JournalEntryType;
  referenceId?: string;
  referenceNumber?: string;
  buildingId?: string;
  lines: JournalLine[];
  totalDebits: number;
  totalCredits: number;
  createdAt: Timestamp;
  createdBy: string;
}
```

## Permission Types

```typescript
// lib/types/permissions.ts

type PermissionKey = keyof UserPermissions;

const DEFAULT_USER_PERMISSIONS: UserPermissions = {
  canCreateInvoice: true,
  canUpdateInvoice: false,
  canCancelInvoice: false,
  canRecordPayment: false,
  canManageBuildings: false,
  canManageCustomers: false,
  canAddExpense: true,
  canViewJournal: false,
  canCreateManualEntry: false,
  canViewReports: false,
  canChangeOwnPassword: true,
};

// Admin-only features that can NEVER be delegated
const ADMIN_ONLY_FEATURES: readonly string[] = [
  'manageUsers',
  'manageCompanyProfile',
  'manageExpenseCategories',
  'manageChartOfAccounts',
] as const;
```

## ZATCA Types

```typescript
// lib/types/zatca.ts

interface ZatcaTlvData {
  sellerName: string;    // Tag 1: Company name
  vatNumber: string;     // Tag 2: 15-digit VAT number
  timestamp: string;     // Tag 3: ISO 8601 with timezone
  totalWithVat: string;  // Tag 4: "115.00" format
  vatAmount: string;     // Tag 5: "15.00" format
}
```

## Zod Validation Schemas

> Zod schemas mirror these interfaces for runtime validation. Each entity has a corresponding Zod schema in `lib/validators/` used by react-hook-form and Firestore write operations.

Key validation rules:
- `vatNumber`: `z.string().regex(/^\d{15}$/)`
- `nationalId`: `z.string().regex(/^\d{10}$/)`
- `phone`: `z.string().regex(/^\+\d{10,15}$/)`
- `email`: `z.string().email()`
- `monthlyRent`: `z.number().min(0)`
- `vatRate`: `z.number().min(0).max(100)`
- `lineItems`: `z.array(lineItemSchema).min(1)`
- `journalLines`: Custom refine: `totalDebits === totalCredits`
