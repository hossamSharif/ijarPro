import { Timestamp } from 'firebase/firestore';

export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

export type JournalEntryType =
  | 'invoice_creation'
  | 'invoice_payment'
  | 'invoice_cancellation'
  | 'invoice_update_reversal'
  | 'expense'
  | 'manual';

export interface Account {
  code: string;
  nameAr: string;
  nameEn: string;
  type: AccountType;
  parentCode?: string;
  isSystem: boolean;
  isActive: boolean;
  level: number;
}

export interface JournalLine {
  accountId: string;
  accountNameAr: string;
  accountNameEn: string;
  debit: number;
  credit: number;
  description?: string;
}

export interface JournalEntry {
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
