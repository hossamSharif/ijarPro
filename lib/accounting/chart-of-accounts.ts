import type { Account, AccountType } from '@/lib/types/accounting';

function account(
  code: string,
  nameAr: string,
  nameEn: string,
  type: AccountType,
  level: number,
  parentCode?: string
): Account {
  const acc: Account = { code, nameAr, nameEn, type, isSystem: true, isActive: true, level };
  if (parentCode) acc.parentCode = parentCode;
  return acc;
}

export const CHART_OF_ACCOUNTS: Account[] = [
  // Level 1: Main categories
  account('1000', 'الأصول', 'Assets', 'asset', 1),
  account('2000', 'الخصوم', 'Liabilities', 'liability', 1),
  account('3000', 'حقوق الملكية', 'Equity', 'equity', 1),
  account('4000', 'الإيرادات', 'Revenue', 'revenue', 1),
  account('5000', 'المصروفات', 'Expenses', 'expense', 1),

  // Level 2: Assets
  account('1100', 'النقد والبنوك', 'Cash and Bank', 'asset', 2, '1000'),
  account('1200', 'المدينون', 'Accounts Receivable', 'asset', 2, '1000'),
  account('1300', 'مصروفات مدفوعة مقدماً', 'Prepaid Expenses', 'asset', 2, '1000'),

  // Level 2: Liabilities
  account('2100', 'الدائنون', 'Accounts Payable', 'liability', 2, '2000'),
  account('2200', 'ضريبة القيمة المضافة المستحقة', 'VAT Payable', 'liability', 2, '2000'),
  account('2300', 'مصروفات مستحقة', 'Accrued Expenses', 'liability', 2, '2000'),

  // Level 2: Equity
  account('3100', 'رأس مال المالك', "Owner's Equity", 'equity', 2, '3000'),
  account('3200', 'الأرباح المحتجزة', 'Retained Earnings', 'equity', 2, '3000'),

  // Level 2: Revenue
  account('4100', 'إيرادات الإيجار', 'Rental Revenue', 'revenue', 2, '4000'),
  account('4200', 'إيرادات أخرى', 'Other Revenue', 'revenue', 2, '4000'),

  // Level 2: Expenses
  account('5100', 'مصروفات الصيانة', 'Maintenance Expenses', 'expense', 2, '5000'),
  account('5200', 'مصروفات المرافق', 'Utility Expenses', 'expense', 2, '5000'),
  account('5300', 'مصروفات الرواتب', 'Salary Expenses', 'expense', 2, '5000'),
  account('5400', 'مصروفات المستلزمات', 'Supply Expenses', 'expense', 2, '5000'),
  account('5900', 'مصروفات أخرى', 'Other Expenses', 'expense', 2, '5000'),
];

export function getAccountByCode(code: string): Account | undefined {
  return CHART_OF_ACCOUNTS.find((a) => a.code === code);
}

export function getAccountsByType(type: AccountType): Account[] {
  return CHART_OF_ACCOUNTS.filter((a) => a.type === type);
}

export function getChildAccounts(parentCode: string): Account[] {
  return CHART_OF_ACCOUNTS.filter((a) => a.parentCode === parentCode);
}
