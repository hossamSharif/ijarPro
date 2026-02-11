import type { PermissionKey } from '@/lib/types/permissions';

export interface FeatureFlagDefinition {
  key: PermissionKey;
  labelKey: string;
  defaultValue: boolean;
  category: 'invoices' | 'management' | 'accounting' | 'general';
}

export const FEATURE_FLAGS: FeatureFlagDefinition[] = [
  { key: 'canCreateInvoice', labelKey: 'users.permissionLabels.canCreateInvoice', defaultValue: true, category: 'invoices' },
  { key: 'canUpdateInvoice', labelKey: 'users.permissionLabels.canUpdateInvoice', defaultValue: false, category: 'invoices' },
  { key: 'canCancelInvoice', labelKey: 'users.permissionLabels.canCancelInvoice', defaultValue: false, category: 'invoices' },
  { key: 'canRecordPayment', labelKey: 'users.permissionLabels.canRecordPayment', defaultValue: false, category: 'invoices' },
  { key: 'canManageBuildings', labelKey: 'users.permissionLabels.canManageBuildings', defaultValue: false, category: 'management' },
  { key: 'canManageCustomers', labelKey: 'users.permissionLabels.canManageCustomers', defaultValue: false, category: 'management' },
  { key: 'canAddExpense', labelKey: 'users.permissionLabels.canAddExpense', defaultValue: true, category: 'accounting' },
  { key: 'canViewJournal', labelKey: 'users.permissionLabels.canViewJournal', defaultValue: false, category: 'accounting' },
  { key: 'canCreateManualEntry', labelKey: 'users.permissionLabels.canCreateManualEntry', defaultValue: false, category: 'accounting' },
  { key: 'canViewReports', labelKey: 'users.permissionLabels.canViewReports', defaultValue: false, category: 'general' },
  { key: 'canChangeOwnPassword', labelKey: 'users.permissionLabels.canChangeOwnPassword', defaultValue: true, category: 'general' },
];
