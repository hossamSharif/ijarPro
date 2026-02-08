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
import type { Invoice, Customer, Apartment, Building, Company } from '@/lib/types/models';
import type { JournalEntry } from '@/lib/types/accounting';
import { createInvoiceEntry } from '@/lib/accounting/journal-engine';
import { generateZatcaBase64 } from '@/lib/zatca/qr-generator';
import { validateZatcaFields } from '@/lib/zatca/invoice-validator';
import { formatISO8601WithTimezone } from '@/lib/utils/dates';
import { addAuditEntry } from '@/lib/utils/audit';
import { getNextInvoiceNumber, generateOfflineInvoiceId } from '@/lib/sync/invoice-sequence';

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
