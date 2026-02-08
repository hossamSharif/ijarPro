'use client';

import {
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch,
  runTransaction,
  arrayUnion,
  increment,
} from 'firebase/firestore';
import { db } from './config';
import {
  invoicesCollection,
  invoiceDoc,
  journalEntriesCollection,
  counterDoc,
  companyRef,
} from './firestore';
import type { InvoiceFormData } from '@/lib/validators/invoice';
import type { Invoice, Customer, Apartment, Building, InvoiceStatus } from '@/lib/types/models';
import type { JournalEntry } from '@/lib/types/accounting';
import { createInvoiceEntry, createPaymentEntry, createCancellationEntry } from '@/lib/accounting/journal-engine';
import { generateZatcaBase64 } from '@/lib/zatca/qr-generator';
import { validateZatcaFields } from '@/lib/zatca/invoice-validator';
import { formatISO8601WithTimezone } from '@/lib/utils/dates';
import { addAuditEntry } from '@/lib/utils/audit';
import { getNextInvoiceNumber, getNextCreditNoteNumber, generateOfflineInvoiceId } from '@/lib/sync/invoice-sequence';
import { canUpdateInvoice, canCancelInvoice, canRecordPayment, getPaymentResultStatus } from '@/lib/invoices/status-validation';
import { createStatusChange } from '@/lib/invoices/status-history';

// === Queries ===

export function getInvoicesQuery() {
  return query(invoicesCollection, orderBy('createdAt', 'desc'));
}

export function getInvoicesByStatusQuery(status: string) {
  return query(invoicesCollection, where('status', '==', status), orderBy('createdAt', 'desc'));
}

export function getInvoicesByBuildingQuery(buildingId: string) {
  return query(invoicesCollection, where('buildingId', '==', buildingId), orderBy('createdAt', 'desc'));
}

export function getInvoicesByCustomerQuery(customerId: string) {
  return query(invoicesCollection, where('customerId', '==', customerId), orderBy('createdAt', 'desc'));
}

export function getInvoicesByStatusAndBuildingQuery(status: string, buildingId: string) {
  return query(
    invoicesCollection,
    where('status', '==', status),
    where('buildingId', '==', buildingId),
    orderBy('createdAt', 'desc')
  );
}

// === Create Invoice ===

interface CreateInvoiceParams {
  data: InvoiceFormData;
  customer: Customer & { id: string };
  apartment: Apartment & { id: string };
  building: Building & { id: string };
  userId: string;
  userName: string;
}

export async function createInvoice({
  data,
  customer,
  apartment,
  building,
  userId,
  userName,
}: CreateInvoiceParams) {
  // Get company info for ZATCA QR
  const companySnap = await getDoc(companyRef);
  const company = companySnap.exists() ? companySnap.data() : null;

  // Calculate amounts
  const subtotal = data.lineItems.reduce((sum, item) => sum + item.amount, 0);
  const vatAmount = Math.round(subtotal * (data.vatRate / 100) * 100) / 100;
  const total = Math.round((subtotal + vatAmount) * 100) / 100;

  // Get sequential invoice number (falls back to offline ID)
  let invoiceNumber: string;
  let tempId: string | undefined;
  try {
    invoiceNumber = await getNextInvoiceNumber();
  } catch {
    // Offline — use temporary ID
    tempId = generateOfflineInvoiceId();
    invoiceNumber = tempId;
  }

  // Generate ZATCA QR data
  const now = new Date();
  const sellerName = company?.nameAr ?? '';
  const vatNumber = company?.vatNumber ?? '';

  const zatcaTlvData = {
    sellerName,
    vatNumber,
    timestamp: formatISO8601WithTimezone(now),
    totalWithVat: total.toFixed(2),
    vatAmount: vatAmount.toFixed(2),
  };

  const zatcaValidation = validateZatcaFields(zatcaTlvData);
  if (!zatcaValidation.valid) {
    throw new Error(`ZATCA validation failed: ${zatcaValidation.errors.join(', ')}`);
  }

  const zatcaQrData = generateZatcaBase64(zatcaTlvData);

  const timestamp = Timestamp.now();

  // Build invoice document
  const invoiceData: Omit<Invoice, 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy'> = {
    invoiceNumber,
    ...(tempId ? { tempId } : {}),
    type: 'debit',
    status: 'issued',
    customerId: customer.id,
    customerNameAr: customer.nameAr,
    customerNameEn: customer.nameEn,
    apartmentId: apartment.id,
    buildingId: building.id,
    buildingNameAr: building.nameAr,
    apartmentUnit: apartment.unitNumber,
    invoiceDate: Timestamp.fromDate(data.invoiceDate),
    supplyDate: Timestamp.fromDate(data.supplyDate),
    rentalPeriodStart: Timestamp.fromDate(data.rentalPeriodStart),
    rentalPeriodEnd: Timestamp.fromDate(data.rentalPeriodEnd),
    lineItems: data.lineItems,
    subtotal,
    vatRate: data.vatRate,
    vatAmount,
    total,
    zatcaQrData,
    statusHistory: [
      {
        status: 'issued',
        timestamp,
        userId,
        note: 'Invoice created',
      },
    ],
  };

  // Create journal entry data
  const journalData = createInvoiceEntry(
    { subtotal, vatAmount, total, invoiceNumber, buildingId: building.id },
    '' // will be set after invoice created
  );

  // Batched write: invoice + journal entry + audit
  const batch = writeBatch(db);

  // Add invoice
  const invoiceRef = addDoc(invoicesCollection, {
    ...invoiceData,
    createdAt: timestamp,
    createdBy: userId,
    updatedAt: timestamp,
    updatedBy: userId,
  });

  // We need the invoice ID for the journal entry referenceId, so use addDoc then batch for journal
  const invoiceDocRef = await invoiceRef;
  const invoiceId = invoiceDocRef.id;

  // Add journal entry
  const journalEntryData: JournalEntry = {
    ...journalData,
    referenceId: invoiceId,
    date: timestamp,
    createdAt: timestamp,
    createdBy: userId,
  };
  await addDoc(journalEntriesCollection, journalEntryData);

  // Add audit log
  await addAuditEntry({
    userId,
    userName,
    action: 'create',
    entityType: 'invoices',
    entityId: invoiceId,
    details: {
      invoiceNumber,
      customerId: customer.id,
      customerNameAr: customer.nameAr,
      apartmentId: apartment.id,
      buildingId: building.id,
      subtotal,
      vatAmount,
      total,
      zatcaQrValid: zatcaValidation.valid,
    },
  });

  return { invoiceId, invoiceNumber };
}

// === Update Invoice (Credit Note + New Debit Note) ===

interface UpdateInvoiceParams {
  originalInvoiceId: string;
  data: InvoiceFormData;
  customer: Customer & { id: string };
  apartment: Apartment & { id: string };
  building: Building & { id: string };
  userId: string;
  userName: string;
}

export async function updateInvoice({
  originalInvoiceId,
  data,
  customer,
  apartment,
  building,
  userId,
  userName,
}: UpdateInvoiceParams) {
  // Get the original invoice
  const originalSnap = await getDoc(invoiceDoc(originalInvoiceId));
  if (!originalSnap.exists()) {
    throw new Error('Original invoice not found');
  }
  const original = originalSnap.data();

  // Validate status transition
  const validation = canUpdateInvoice(original.status);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Get company info for ZATCA QR
  const companySnap = await getDoc(companyRef);
  const company = companySnap.exists() ? companySnap.data() : null;
  const sellerName = company?.nameAr ?? '';
  const vatNumber = company?.vatNumber ?? '';
  const now = new Date();

  // Get new sequential numbers
  const creditNoteNumber = await getNextCreditNoteNumber();
  const newInvoiceNumber = await getNextInvoiceNumber();

  // Calculate new amounts
  const subtotal = data.lineItems.reduce((sum, item) => sum + item.amount, 0);
  const vatAmount = Math.round(subtotal * (data.vatRate / 100) * 100) / 100;
  const total = Math.round((subtotal + vatAmount) * 100) / 100;

  const timestamp = Timestamp.now();

  // Generate ZATCA QR for credit note
  const creditNoteTlv = {
    sellerName,
    vatNumber,
    timestamp: formatISO8601WithTimezone(now),
    totalWithVat: original.total.toFixed(2),
    vatAmount: original.vatAmount.toFixed(2),
  };
  const creditNoteQr = generateZatcaBase64(creditNoteTlv);

  // Generate ZATCA QR for new invoice
  const newInvoiceTlv = {
    sellerName,
    vatNumber,
    timestamp: formatISO8601WithTimezone(now),
    totalWithVat: total.toFixed(2),
    vatAmount: vatAmount.toFixed(2),
  };
  const newInvoiceValidation = validateZatcaFields(newInvoiceTlv);
  if (!newInvoiceValidation.valid) {
    throw new Error(`ZATCA validation failed: ${newInvoiceValidation.errors.join(', ')}`);
  }
  const newInvoiceQr = generateZatcaBase64(newInvoiceTlv);

  // 1. Create credit note
  const creditNoteData: Omit<Invoice, 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy'> = {
    invoiceNumber: creditNoteNumber,
    type: 'credit',
    status: 'issued',
    customerId: original.customerId,
    customerNameAr: original.customerNameAr,
    customerNameEn: original.customerNameEn,
    apartmentId: original.apartmentId,
    buildingId: original.buildingId,
    buildingNameAr: original.buildingNameAr,
    apartmentUnit: original.apartmentUnit,
    invoiceDate: timestamp,
    supplyDate: original.supplyDate,
    rentalPeriodStart: original.rentalPeriodStart,
    rentalPeriodEnd: original.rentalPeriodEnd,
    lineItems: original.lineItems,
    subtotal: original.subtotal,
    vatRate: original.vatRate,
    vatAmount: original.vatAmount,
    total: original.total,
    zatcaQrData: creditNoteQr,
    originalInvoiceId,
    originalInvoiceNumber: original.invoiceNumber,
    cancellationReason: `Updated — see ${newInvoiceNumber}`,
    statusHistory: [
      createStatusChange('issued', userId, `Credit note for update of ${original.invoiceNumber}`),
    ],
  };

  const creditNoteRef = await addDoc(invoicesCollection, {
    ...creditNoteData,
    createdAt: timestamp,
    createdBy: userId,
    updatedAt: timestamp,
    updatedBy: userId,
  });

  // 2. Create new debit invoice
  const newInvoiceData: Omit<Invoice, 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy'> = {
    invoiceNumber: newInvoiceNumber,
    type: 'debit',
    status: 'issued',
    customerId: customer.id,
    customerNameAr: customer.nameAr,
    customerNameEn: customer.nameEn,
    apartmentId: apartment.id,
    buildingId: building.id,
    buildingNameAr: building.nameAr,
    apartmentUnit: apartment.unitNumber,
    invoiceDate: timestamp,
    supplyDate: Timestamp.fromDate(data.supplyDate),
    rentalPeriodStart: Timestamp.fromDate(data.rentalPeriodStart),
    rentalPeriodEnd: Timestamp.fromDate(data.rentalPeriodEnd),
    lineItems: data.lineItems,
    subtotal,
    vatRate: data.vatRate,
    vatAmount,
    total,
    zatcaQrData: newInvoiceQr,
    originalInvoiceId,
    originalInvoiceNumber: original.invoiceNumber,
    statusHistory: [
      createStatusChange('issued', userId, `Replacement for ${original.invoiceNumber}`),
    ],
  };

  const newInvoiceRef = await addDoc(invoicesCollection, {
    ...newInvoiceData,
    createdAt: timestamp,
    createdBy: userId,
    updatedAt: timestamp,
    updatedBy: userId,
  });

  // 3. Mark original as cancelled
  await updateDoc(invoiceDoc(originalInvoiceId), {
    status: 'cancelled' as InvoiceStatus,
    cancellationReason: `Updated — see ${newInvoiceNumber}`,
    updatedAt: timestamp,
    updatedBy: userId,
    statusHistory: arrayUnion(
      createStatusChange('cancelled', userId, `Updated — credit note ${creditNoteNumber}, new invoice ${newInvoiceNumber}`)
    ),
  });

  // 4. Create reversal journal entry (for original)
  const reversalEntry = createCancellationEntry(
    {
      subtotal: original.subtotal,
      vatAmount: original.vatAmount,
      total: original.total,
      invoiceNumber: original.invoiceNumber,
      buildingId: original.buildingId,
    },
    originalInvoiceId
  );
  await addDoc(journalEntriesCollection, {
    ...reversalEntry,
    entryType: 'invoice_update_reversal',
    description: `Reversal of ${original.invoiceNumber} (update)`,
    referenceId: creditNoteRef.id,
    referenceNumber: creditNoteNumber,
    createdAt: timestamp,
    createdBy: userId,
  } as JournalEntry);

  // 5. Create new journal entry (for new invoice)
  const newEntry = createInvoiceEntry(
    { subtotal, vatAmount, total, invoiceNumber: newInvoiceNumber, buildingId: building.id },
    newInvoiceRef.id
  );
  await addDoc(journalEntriesCollection, {
    ...newEntry,
    referenceId: newInvoiceRef.id,
    createdAt: timestamp,
    createdBy: userId,
  } as JournalEntry);

  // 6. Audit log entries
  await addAuditEntry({
    userId,
    userName,
    action: 'update',
    entityType: 'invoices',
    entityId: originalInvoiceId,
    details: {
      originalInvoiceNumber: original.invoiceNumber,
      creditNoteNumber,
      creditNoteId: creditNoteRef.id,
      newInvoiceNumber,
      newInvoiceId: newInvoiceRef.id,
      originalTotal: original.total,
      newTotal: total,
    },
  });

  return {
    creditNoteId: creditNoteRef.id,
    creditNoteNumber,
    newInvoiceId: newInvoiceRef.id,
    newInvoiceNumber,
  };
}

// === Cancel Invoice ===

interface CancelInvoiceParams {
  invoiceId: string;
  reason: string;
  userId: string;
  userName: string;
}

export async function cancelInvoice({
  invoiceId,
  reason,
  userId,
  userName,
}: CancelInvoiceParams) {
  // Get the invoice
  const invoiceSnap = await getDoc(invoiceDoc(invoiceId));
  if (!invoiceSnap.exists()) {
    throw new Error('Invoice not found');
  }
  const invoice = invoiceSnap.data();

  // Validate status
  const validation = canCancelInvoice(invoice.status);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Get company info for ZATCA QR
  const companySnap = await getDoc(companyRef);
  const company = companySnap.exists() ? companySnap.data() : null;
  const sellerName = company?.nameAr ?? '';
  const vatNumberStr = company?.vatNumber ?? '';
  const now = new Date();

  // Get credit note number
  const creditNoteNumber = await getNextCreditNoteNumber();
  const timestamp = Timestamp.now();

  // Generate ZATCA QR for credit note
  const creditNoteTlv = {
    sellerName,
    vatNumber: vatNumberStr,
    timestamp: formatISO8601WithTimezone(now),
    totalWithVat: invoice.total.toFixed(2),
    vatAmount: invoice.vatAmount.toFixed(2),
  };
  const creditNoteQr = generateZatcaBase64(creditNoteTlv);

  // 1. Create credit note
  const creditNoteData: Omit<Invoice, 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy'> = {
    invoiceNumber: creditNoteNumber,
    type: 'credit',
    status: 'issued',
    customerId: invoice.customerId,
    customerNameAr: invoice.customerNameAr,
    customerNameEn: invoice.customerNameEn,
    apartmentId: invoice.apartmentId,
    buildingId: invoice.buildingId,
    buildingNameAr: invoice.buildingNameAr,
    apartmentUnit: invoice.apartmentUnit,
    invoiceDate: timestamp,
    supplyDate: invoice.supplyDate,
    rentalPeriodStart: invoice.rentalPeriodStart,
    rentalPeriodEnd: invoice.rentalPeriodEnd,
    lineItems: invoice.lineItems,
    subtotal: invoice.subtotal,
    vatRate: invoice.vatRate,
    vatAmount: invoice.vatAmount,
    total: invoice.total,
    zatcaQrData: creditNoteQr,
    originalInvoiceId: invoiceId,
    originalInvoiceNumber: invoice.invoiceNumber,
    cancellationReason: reason,
    statusHistory: [
      createStatusChange('issued', userId, `Credit note for cancellation of ${invoice.invoiceNumber}`),
    ],
  };

  const creditNoteRef = await addDoc(invoicesCollection, {
    ...creditNoteData,
    createdAt: timestamp,
    createdBy: userId,
    updatedAt: timestamp,
    updatedBy: userId,
  });

  // 2. Mark original as cancelled
  await updateDoc(invoiceDoc(invoiceId), {
    status: 'cancelled' as InvoiceStatus,
    cancellationReason: reason,
    updatedAt: timestamp,
    updatedBy: userId,
    statusHistory: arrayUnion(
      createStatusChange('cancelled', userId, `Cancelled — ${reason}`)
    ),
  });

  // 3. Create reversal journal entry
  const reversalEntry = createCancellationEntry(
    {
      subtotal: invoice.subtotal,
      vatAmount: invoice.vatAmount,
      total: invoice.total,
      invoiceNumber: invoice.invoiceNumber,
      buildingId: invoice.buildingId,
    },
    invoiceId
  );
  await addDoc(journalEntriesCollection, {
    ...reversalEntry,
    referenceId: creditNoteRef.id,
    referenceNumber: creditNoteNumber,
    createdAt: timestamp,
    createdBy: userId,
  } as JournalEntry);

  // 4. Audit log
  await addAuditEntry({
    userId,
    userName,
    action: 'cancel',
    entityType: 'invoices',
    entityId: invoiceId,
    details: {
      invoiceNumber: invoice.invoiceNumber,
      creditNoteNumber,
      creditNoteId: creditNoteRef.id,
      reason,
      total: invoice.total,
    },
  });

  return {
    creditNoteId: creditNoteRef.id,
    creditNoteNumber,
  };
}

// === Record Payment ===

interface RecordPaymentParams {
  invoiceId: string;
  amount: number;
  userId: string;
  userName: string;
}

export async function recordPayment({
  invoiceId,
  amount,
  userId,
  userName,
}: RecordPaymentParams) {
  // Get the invoice
  const invoiceSnap = await getDoc(invoiceDoc(invoiceId));
  if (!invoiceSnap.exists()) {
    throw new Error('Invoice not found');
  }
  const invoice = invoiceSnap.data();

  // Validate status
  const statusValidation = canRecordPayment(invoice.status);
  if (!statusValidation.valid) {
    throw new Error(statusValidation.error);
  }

  // Validate amount
  const currentPaid = invoice.paymentAmount ?? 0;
  const remaining = Math.round((invoice.total - currentPaid) * 100) / 100;

  if (amount <= 0) {
    throw new Error('Payment amount must be greater than 0');
  }
  if (amount > remaining) {
    throw new Error(`Payment amount (${amount}) exceeds remaining balance (${remaining})`);
  }

  // Determine new status
  const newStatus = getPaymentResultStatus(amount, currentPaid, invoice.total);
  const timestamp = Timestamp.now();
  const newPaidTotal = Math.round((currentPaid + amount) * 100) / 100;

  // 1. Update invoice
  await updateDoc(invoiceDoc(invoiceId), {
    paymentAmount: newPaidTotal,
    paymentDate: timestamp,
    status: newStatus,
    updatedAt: timestamp,
    updatedBy: userId,
    statusHistory: arrayUnion(
      createStatusChange(newStatus, userId, `Payment of ${amount.toFixed(2)} SAR recorded`)
    ),
  });

  // 2. Create journal entry (DR: Cash/Bank, CR: AR)
  const journalData = createPaymentEntry(
    { invoiceNumber: invoice.invoiceNumber, buildingId: invoice.buildingId },
    invoiceId,
    amount
  );
  await addDoc(journalEntriesCollection, {
    ...journalData,
    referenceId: invoiceId,
    createdAt: timestamp,
    createdBy: userId,
  } as JournalEntry);

  // 3. Audit log
  await addAuditEntry({
    userId,
    userName,
    action: 'payment',
    entityType: 'invoices',
    entityId: invoiceId,
    details: {
      invoiceNumber: invoice.invoiceNumber,
      paymentAmount: amount,
      previousPaid: currentPaid,
      newTotalPaid: newPaidTotal,
      remaining: Math.round((invoice.total - newPaidTotal) * 100) / 100,
      previousStatus: invoice.status,
      newStatus,
    },
  });

  return {
    newStatus,
    totalPaid: newPaidTotal,
    remaining: Math.round((invoice.total - newPaidTotal) * 100) / 100,
  };
}
