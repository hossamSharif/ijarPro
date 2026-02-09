'use client';

import {
  addDoc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import {
  journalEntriesCollection,
  accountsCollection,
  accountDoc,
} from './firestore';
import type { JournalEntryFormData } from '@/lib/validators/journal-entry';
import type { JournalEntry, Account } from '@/lib/types/accounting';
import { CHART_OF_ACCOUNTS } from '@/lib/accounting/chart-of-accounts';
import { addAuditEntry } from '@/lib/utils/audit';
import { checkWriteAllowed, trackOfflineWrite } from '@/lib/sync/write-guard';

// === Queries ===

export function getJournalEntriesQuery() {
  return query(journalEntriesCollection, orderBy('date', 'desc'));
}

export function getJournalEntriesByTypeQuery(entryType: string) {
  return query(
    journalEntriesCollection,
    where('entryType', '==', entryType),
    orderBy('date', 'desc')
  );
}

export function getJournalEntriesByDateRangeQuery(startDate: Date, endDate: Date) {
  return query(
    journalEntriesCollection,
    where('date', '>=', Timestamp.fromDate(startDate)),
    where('date', '<=', Timestamp.fromDate(endDate)),
    orderBy('date', 'desc')
  );
}

// === Create Manual Journal Entry ===

interface CreateManualEntryParams {
  data: JournalEntryFormData;
  userId: string;
  userName: string;
}

export async function createManualJournalEntry({
  data,
  userId,
  userName,
}: CreateManualEntryParams) {
  checkWriteAllowed();
  const timestamp = Timestamp.now();

  const totalDebits = Math.round(data.lines.reduce((sum, line) => sum + line.debit, 0) * 100) / 100;
  const totalCredits = Math.round(data.lines.reduce((sum, line) => sum + line.credit, 0) * 100) / 100;

  // Balance enforcement
  if (Math.abs(totalDebits - totalCredits) >= 0.01) {
    throw new Error('Total debits must equal total credits');
  }

  const entryData: JournalEntry = {
    date: Timestamp.fromDate(data.date),
    description: data.description,
    entryType: 'manual',
    buildingId: data.buildingId,
    lines: data.lines,
    totalDebits,
    totalCredits,
    createdAt: timestamp,
    createdBy: userId,
  };

  const ref = await addDoc(journalEntriesCollection, entryData);

  // Audit log
  await addAuditEntry({
    userId,
    userName,
    action: 'create',
    entityType: 'journalEntries',
    entityId: ref.id,
    details: {
      entryType: 'manual',
      description: data.description,
      totalDebits,
      totalCredits,
      lineCount: data.lines.length,
      buildingId: data.buildingId,
    },
  });

  return { entryId: ref.id };
}

// === Chart of Accounts Seeding ===

export async function seedChartOfAccounts(userId: string, userName: string) {
  // Check if accounts already exist
  const existing = await getDocs(accountsCollection);
  if (!existing.empty) {
    return { seeded: false, count: existing.size };
  }

  // Seed predefined accounts
  for (const account of CHART_OF_ACCOUNTS) {
    await setDoc(accountDoc(account.code), account);
  }

  // Audit log
  await addAuditEntry({
    userId,
    userName,
    action: 'create',
    entityType: 'accounts',
    entityId: 'chart-of-accounts',
    details: {
      accountCount: CHART_OF_ACCOUNTS.length,
      action: 'seed',
    },
  });

  return { seeded: true, count: CHART_OF_ACCOUNTS.length };
}

// === Add Custom Sub-Account ===

interface AddSubAccountParams {
  code: string;
  nameAr: string;
  nameEn: string;
  parentCode: string;
  userId: string;
  userName: string;
}

export async function addCustomSubAccount({
  code,
  nameAr,
  nameEn,
  parentCode,
  userId,
  userName,
}: AddSubAccountParams) {
  // Find parent to get type and level
  const parentSnap = await getDocs(
    query(accountsCollection, where('code', '==', parentCode))
  );

  if (parentSnap.empty) {
    throw new Error('Parent account not found');
  }

  const parent = parentSnap.docs[0].data();

  // Check code uniqueness
  const existingSnap = await getDocs(
    query(accountsCollection, where('code', '==', code))
  );
  if (!existingSnap.empty) {
    throw new Error('Account code already exists');
  }

  const newAccount: Account = {
    code,
    nameAr,
    nameEn,
    type: parent.type,
    parentCode,
    isSystem: false,
    isActive: true,
    level: parent.level + 1,
  };

  await setDoc(accountDoc(code), newAccount);

  // Audit log
  await addAuditEntry({
    userId,
    userName,
    action: 'create',
    entityType: 'accounts',
    entityId: code,
    details: {
      nameAr,
      nameEn,
      parentCode,
      type: parent.type,
      level: newAccount.level,
    },
  });

  return { accountCode: code };
}
