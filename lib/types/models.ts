import { Timestamp } from 'firebase/firestore';

// === Base Types ===

export interface BaseDocument {
  createdAt: Timestamp;
  createdBy: string;
  updatedAt: Timestamp;
  updatedBy: string;
}

export interface BilingualName {
  nameAr: string;
  nameEn: string;
}

// === Company ===

export interface Address {
  streetAr: string;
  streetEn: string;
  cityAr: string;
  cityEn: string;
  districtAr: string;
  districtEn: string;
  postalCode: string;
  additionalNumber?: string;
}

export interface Company extends BaseDocument {
  nameAr: string;
  nameEn: string;
  logoUrl?: string;
  crNumber: string;
  vatNumber: string;
  address: Address;
  phone: string;
  email?: string;
  website?: string;
  vatRate: number;
  sessionTimeout: number;
  expenseCategories: string[];
}

// === Users ===

export interface UserPermissions {
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

export type UserRole = 'admin' | 'user';

export interface User extends BaseDocument, BilingualName {
  username: string;
  email: string;
  phone?: string;
  role: UserRole;
  isActive: boolean;
  permissions: UserPermissions;
}

// === Buildings ===

export type BuildingStatus = 'active' | 'inactive';

export interface Building extends BaseDocument, BilingualName {
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

export type ApartmentStatus = 'vacant' | 'occupied' | 'under_maintenance';

export interface Apartment extends BaseDocument {
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

export interface Customer extends BaseDocument, BilingualName {
  nationalId: string;
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

export type InvoiceType = 'debit' | 'credit';
export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled';

export interface LineItem {
  descriptionAr: string;
  descriptionEn: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface StatusChange {
  status: InvoiceStatus;
  timestamp: Timestamp;
  userId: string;
  note?: string;
}

export interface Invoice extends BaseDocument {
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
  zatcaQrData: string;
  originalInvoiceId?: string;
  originalInvoiceNumber?: string;
  cancellationReason?: string;
  paymentAmount?: number;
  paymentDate?: Timestamp;
  statusHistory: StatusChange[];
}

// === Expenses ===

export interface Expense extends BaseDocument {
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

export interface Counter {
  currentValue: number;
  prefix: string;
  padding: number;
}

// === Audit Log ===

export type AuditAction =
  | 'create'
  | 'update'
  | 'cancel'
  | 'status_change'
  | 'permission_change'
  | 'account_activate'
  | 'account_deactivate'
  | 'payment'
  | 'sync_conflict';

export interface AuditLogEntry {
  timestamp: Timestamp;
  userId: string;
  userName: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  details?: Record<string, unknown>;
  syncConflict?: boolean;
}
