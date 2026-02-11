import type { UserPermissions } from './models';

export type PermissionKey = keyof UserPermissions;

export const DEFAULT_USER_PERMISSIONS: UserPermissions = {
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

export const ADMIN_ONLY_FEATURES = [
  'manageUsers',
  'manageCompanyProfile',
  'manageExpenseCategories',
  'manageChartOfAccounts',
] as const;

export type AdminOnlyFeature = (typeof ADMIN_ONLY_FEATURES)[number];
