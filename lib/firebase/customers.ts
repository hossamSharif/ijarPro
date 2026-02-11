'use client';

import {
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch,
  increment,
  deleteField,
} from 'firebase/firestore';
import { db } from './config';
import {
  customersCollection,
  customerDoc,
  apartmentDoc,
  buildingDoc,
  invoicesCollection,
} from './firestore';
import type { CustomerFormData } from '@/lib/validators/customer';
import { addAuditEntry } from '@/lib/utils/audit';
import { checkWriteAllowed, trackOfflineWrite } from '@/lib/sync/write-guard';

// === Queries ===

export function getActiveCustomersQuery() {
  return query(customersCollection, where('isActive', '==', true), orderBy('nameAr'));
}

export function getAllCustomersQuery() {
  return query(customersCollection, orderBy('nameAr'));
}

export async function searchByNationalId(nationalId: string) {
  const q = query(customersCollection, where('nationalId', '==', nationalId));
  const snap = await getDocs(q);
  return snap.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
}

export async function checkNationalIdExists(nationalId: string): Promise<boolean> {
  const results = await searchByNationalId(nationalId);
  return results.length > 0;
}

// === CRUD Operations ===

interface CreateCustomerParams {
  data: CustomerFormData;
  userId: string;
  userName: string;
}

export async function createCustomer({ data, userId, userName }: CreateCustomerParams) {
  checkWriteAllowed();
  const exists = await checkNationalIdExists(data.nationalId);
  if (exists) {
    throw new Error('NATIONAL_ID_EXISTS');
  }

  const now = Timestamp.now();
  const customerData: Record<string, unknown> = {
    ...data,
    isActive: true,
    createdAt: now,
    createdBy: userId,
    updatedAt: now,
    updatedBy: userId,
  };
  if (data.idExpiry) {
    customerData.idExpiry = Timestamp.fromDate(data.idExpiry);
  } else {
    delete customerData.idExpiry;
  }
  // Remove undefined optional fields to avoid Firestore rejection
  Object.keys(customerData).forEach((key) => {
    if (customerData[key] === undefined) delete customerData[key];
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const docRef = await addDoc(customersCollection, customerData as any);

  await addAuditEntry({
    userId,
    userName,
    action: 'create',
    entityType: 'customers',
    entityId: docRef.id,
    details: { nameAr: data.nameAr, nationalId: data.nationalId },
  });

  trackOfflineWrite();
  return docRef.id;
}

interface UpdateCustomerParams {
  customerId: string;
  data: Partial<Omit<CustomerFormData, 'nationalId'>>;
  userId: string;
  userName: string;
}

export async function updateCustomer({ customerId, data, userId, userName }: UpdateCustomerParams) {
  const ref = customerDoc(customerId);
  const updateData: Record<string, unknown> = {
    ...data,
    updatedAt: Timestamp.now(),
    updatedBy: userId,
  };

  if (data.idExpiry) {
    updateData.idExpiry = Timestamp.fromDate(data.idExpiry);
  }

  await updateDoc(ref, updateData);

  await addAuditEntry({
    userId,
    userName,
    action: 'update',
    entityType: 'customers',
    entityId: customerId,
    details: data,
  });
}

interface DeactivateCustomerParams {
  customerId: string;
  userId: string;
  userName: string;
}

export async function deactivateCustomer({ customerId, userId, userName }: DeactivateCustomerParams) {
  const ref = customerDoc(customerId);
  await updateDoc(ref, {
    isActive: false,
    updatedAt: Timestamp.now(),
    updatedBy: userId,
  });

  await addAuditEntry({
    userId,
    userName,
    action: 'status_change',
    entityType: 'customers',
    entityId: customerId,
    details: { isActive: false },
  });
}

export async function reactivateCustomer({ customerId, userId, userName }: DeactivateCustomerParams) {
  const ref = customerDoc(customerId);
  await updateDoc(ref, {
    isActive: true,
    updatedAt: Timestamp.now(),
    updatedBy: userId,
  });

  await addAuditEntry({
    userId,
    userName,
    action: 'status_change',
    entityType: 'customers',
    entityId: customerId,
    details: { isActive: true },
  });
}

// === Customer-Apartment Linking ===

interface LinkCustomerParams {
  customerId: string;
  apartmentId: string;
  buildingId: string;
  leaseStart: Date;
  leaseEnd: Date;
  userId: string;
  userName: string;
}

export async function linkCustomerToApartment({
  customerId,
  apartmentId,
  buildingId,
  leaseStart,
  leaseEnd,
  userId,
  userName,
}: LinkCustomerParams) {
  checkWriteAllowed();
  const batch = writeBatch(db);
  const now = Timestamp.now();

  // Update apartment: set to occupied with customer reference
  batch.update(apartmentDoc(apartmentId), {
    status: 'occupied',
    currentCustomerId: customerId,
    leaseStart: Timestamp.fromDate(leaseStart),
    leaseEnd: Timestamp.fromDate(leaseEnd),
    updatedAt: now,
    updatedBy: userId,
  });

  // Update customer: set current apartment/building
  batch.update(customerDoc(customerId), {
    currentApartmentId: apartmentId,
    currentBuildingId: buildingId,
    updatedAt: now,
    updatedBy: userId,
  });

  // Update building counts: occupied +1, vacant -1
  batch.update(buildingDoc(buildingId), {
    occupiedCount: increment(1),
    vacantCount: increment(-1),
    updatedAt: now,
    updatedBy: userId,
  });

  await batch.commit();

  await addAuditEntry({
    userId,
    userName,
    action: 'update',
    entityType: 'customers',
    entityId: customerId,
    details: {
      action: 'link_apartment',
      apartmentId,
      buildingId,
      leaseStart: leaseStart.toISOString(),
      leaseEnd: leaseEnd.toISOString(),
    },
  });
}

interface UnlinkCustomerParams {
  customerId: string;
  apartmentId: string;
  buildingId: string;
  userId: string;
  userName: string;
}

export async function unlinkCustomerFromApartment({
  customerId,
  apartmentId,
  buildingId,
  userId,
  userName,
}: UnlinkCustomerParams) {
  const batch = writeBatch(db);
  const now = Timestamp.now();

  // Update apartment: set to vacant, clear customer fields
  batch.update(apartmentDoc(apartmentId), {
    status: 'vacant',
    currentCustomerId: deleteField(),
    leaseStart: deleteField(),
    leaseEnd: deleteField(),
    updatedAt: now,
    updatedBy: userId,
  });

  // Update customer: clear apartment/building fields
  batch.update(customerDoc(customerId), {
    currentApartmentId: deleteField(),
    currentBuildingId: deleteField(),
    updatedAt: now,
    updatedBy: userId,
  });

  // Update building counts: occupied -1, vacant +1
  batch.update(buildingDoc(buildingId), {
    occupiedCount: increment(-1),
    vacantCount: increment(1),
    updatedAt: now,
    updatedBy: userId,
  });

  await batch.commit();

  await addAuditEntry({
    userId,
    userName,
    action: 'update',
    entityType: 'customers',
    entityId: customerId,
    details: {
      action: 'unlink_apartment',
      apartmentId,
      buildingId,
    },
  });
}

// === Invoice History Query ===

export function getCustomerInvoicesQuery(customerId: string) {
  return query(invoicesCollection, where('customerId', '==', customerId), orderBy('createdAt', 'desc'));
}
