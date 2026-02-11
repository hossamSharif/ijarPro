import { Timestamp } from 'firebase/firestore';
import type { JournalEntry, JournalLine, JournalEntryType } from '@/lib/types/accounting';
import type { Invoice, Expense } from '@/lib/types/models';
import { getAccountByCode } from './chart-of-accounts';

function createLine(
  accountCode: string,
  debit: number,
  credit: number,
  description?: string
): JournalLine {
  const account = getAccountByCode(accountCode);
  return {
    accountId: accountCode,
    accountNameAr: account?.nameAr ?? accountCode,
    accountNameEn: account?.nameEn ?? accountCode,
    debit: Math.round(debit * 100) / 100,
    credit: Math.round(credit * 100) / 100,
    description,
  };
}

function createEntry(
  entryType: JournalEntryType,
  description: string,
  lines: JournalLine[],
  referenceId?: string,
  referenceNumber?: string,
  buildingId?: string
): Omit<JournalEntry, 'createdAt' | 'createdBy'> {
  const totalDebits = Math.round(lines.reduce((s, l) => s + l.debit, 0) * 100) / 100;
  const totalCredits = Math.round(lines.reduce((s, l) => s + l.credit, 0) * 100) / 100;

  return {
    date: Timestamp.now(),
    description,
    entryType,
    referenceId,
    referenceNumber,
    buildingId,
    lines,
    totalDebits,
    totalCredits,
  };
}

export function createInvoiceEntry(
  invoice: Pick<Invoice, 'subtotal' | 'vatAmount' | 'total' | 'invoiceNumber' | 'buildingId'>,
  invoiceId: string
): Omit<JournalEntry, 'createdAt' | 'createdBy'> {
  const lines: JournalLine[] = [
    createLine('1200', invoice.total, 0, `AR — ${invoice.invoiceNumber}`),
    createLine('4100', 0, invoice.subtotal, `Revenue — ${invoice.invoiceNumber}`),
    createLine('2200', 0, invoice.vatAmount, `VAT — ${invoice.invoiceNumber}`),
  ];

  return createEntry(
    'invoice_creation',
    `Invoice ${invoice.invoiceNumber}`,
    lines,
    invoiceId,
    invoice.invoiceNumber,
    invoice.buildingId
  );
}

export function createPaymentEntry(
  invoice: Pick<Invoice, 'invoiceNumber' | 'buildingId'>,
  invoiceId: string,
  amount: number
): Omit<JournalEntry, 'createdAt' | 'createdBy'> {
  const lines: JournalLine[] = [
    createLine('1100', amount, 0, `Payment — ${invoice.invoiceNumber}`),
    createLine('1200', 0, amount, `AR — ${invoice.invoiceNumber}`),
  ];

  return createEntry(
    'invoice_payment',
    `Payment for ${invoice.invoiceNumber}`,
    lines,
    invoiceId,
    invoice.invoiceNumber,
    invoice.buildingId
  );
}

export function createCancellationEntry(
  invoice: Pick<Invoice, 'subtotal' | 'vatAmount' | 'total' | 'invoiceNumber' | 'buildingId'>,
  invoiceId: string
): Omit<JournalEntry, 'createdAt' | 'createdBy'> {
  const lines: JournalLine[] = [
    createLine('4100', invoice.subtotal, 0, `Reversal Revenue — ${invoice.invoiceNumber}`),
    createLine('2200', invoice.vatAmount, 0, `Reversal VAT — ${invoice.invoiceNumber}`),
    createLine('1200', 0, invoice.total, `Reversal AR — ${invoice.invoiceNumber}`),
  ];

  return createEntry(
    'invoice_cancellation',
    `Cancellation of ${invoice.invoiceNumber}`,
    lines,
    invoiceId,
    invoice.invoiceNumber,
    invoice.buildingId
  );
}

export function createExpenseEntry(
  expense: Pick<Expense, 'amount' | 'vatAmount' | 'category' | 'description' | 'buildingId'>,
  expenseId: string,
  accountCode: string = '5900'
): Omit<JournalEntry, 'createdAt' | 'createdBy'> {
  const vatAmount = expense.vatAmount ?? 0;
  const lines: JournalLine[] = [
    createLine(accountCode, expense.amount, 0, expense.description),
  ];

  if (vatAmount > 0) {
    lines.push(createLine('2200', vatAmount, 0, `Input VAT — ${expense.description}`));
  }

  lines.push(createLine('1100', 0, expense.amount + vatAmount, `Cash — ${expense.description}`));

  return createEntry(
    'expense',
    expense.description,
    lines,
    expenseId,
    undefined,
    expense.buildingId
  );
}
