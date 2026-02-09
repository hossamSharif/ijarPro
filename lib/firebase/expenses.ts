'use client';

import {
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import {
  expensesCollection,
  journalEntriesCollection,
} from './firestore';
import { uploadReceipt } from './storage';
import type { ExpenseFormData } from '@/lib/validators/expense';
import type { Expense } from '@/lib/types/models';
import type { JournalEntry } from '@/lib/types/accounting';
import { createExpenseEntry } from '@/lib/accounting/journal-engine';
import { addAuditEntry } from '@/lib/utils/audit';
import { checkWriteAllowed, trackOfflineWrite } from '@/lib/sync/write-guard';

// === Category to Account Code Mapping ===

const CATEGORY_ACCOUNT_MAP: Record<string, string> = {
  'صيانة': '5100',       // Maintenance Expenses
  'maintenance': '5100',
  'كهرباء': '5200',      // Utility Expenses
  'electricity': '5200',
  'مياه': '5200',        // Utility Expenses
  'water': '5200',
  'نظافة': '5400',       // Supply Expenses
  'cleaning': '5400',
  'أمن': '5300',         // Salary Expenses (security personnel)
  'security': '5300',
  'تأمين': '5900',       // Other Expenses
  'insurance': '5900',
  'رواتب': '5300',       // Salary Expenses
  'salaries': '5300',
};

function getExpenseAccountCode(category: string): string {
  return CATEGORY_ACCOUNT_MAP[category] ?? '5900'; // Default to Other Expenses
}

// === Queries ===

export function getExpensesQuery() {
  return query(expensesCollection, orderBy('date', 'desc'));
}

export function getExpensesByCategoryQuery(category: string) {
  return query(
    expensesCollection,
    where('category', '==', category),
    orderBy('date', 'desc')
  );
}

export function getExpensesByBuildingQuery(buildingId: string) {
  return query(
    expensesCollection,
    where('buildingId', '==', buildingId),
    orderBy('date', 'desc')
  );
}

export function getExpensesByDateRangeQuery(startDate: Date, endDate: Date) {
  return query(
    expensesCollection,
    where('date', '>=', Timestamp.fromDate(startDate)),
    where('date', '<=', Timestamp.fromDate(endDate)),
    orderBy('date', 'desc')
  );
}

// === Create Expense ===

interface CreateExpenseParams {
  data: ExpenseFormData;
  receiptFile?: File | null;
  userId: string;
  userName: string;
}

export async function createExpense({
  data,
  receiptFile,
  userId,
  userName,
}: CreateExpenseParams) {
  checkWriteAllowed();
  const timestamp = Timestamp.now();

  // Upload receipt if provided
  let receiptUrl: string | undefined;
  let receiptFileName: string | undefined;
  if (receiptFile) {
    const path = `receipts/${Date.now()}-${receiptFile.name}`;
    receiptUrl = await uploadReceipt(receiptFile, path);
    receiptFileName = receiptFile.name;
  }

  // Build expense document
  const expenseData: Omit<Expense, 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy'> = {
    date: Timestamp.fromDate(data.date),
    category: data.category,
    amount: data.amount,
    vatAmount: data.vatAmount,
    description: data.description,
    buildingId: data.buildingId,
    apartmentId: data.apartmentId,
    receiptUrl,
    receiptFileName,
  };

  // Add expense document
  const expenseRef = await addDoc(expensesCollection, {
    ...expenseData,
    createdAt: timestamp,
    createdBy: userId,
    updatedAt: timestamp,
    updatedBy: userId,
  });

  const expenseId = expenseRef.id;

  // Create journal entry (DR: Expense Account by category, CR: Cash/Bank)
  const accountCode = getExpenseAccountCode(data.category);
  const journalData = createExpenseEntry(
    {
      amount: data.amount,
      vatAmount: data.vatAmount,
      category: data.category,
      description: data.description,
      buildingId: data.buildingId,
    },
    expenseId,
    accountCode
  );

  await addDoc(journalEntriesCollection, {
    ...journalData,
    referenceId: expenseId,
    date: timestamp,
    createdAt: timestamp,
    createdBy: userId,
  } as JournalEntry);

  // Audit log
  await addAuditEntry({
    userId,
    userName,
    action: 'create',
    entityType: 'expenses',
    entityId: expenseId,
    details: {
      category: data.category,
      amount: data.amount,
      vatAmount: data.vatAmount,
      description: data.description,
      buildingId: data.buildingId,
      apartmentId: data.apartmentId,
      hasReceipt: !!receiptFile,
      accountCode,
    },
  });

  trackOfflineWrite();
  return { expenseId };
}
