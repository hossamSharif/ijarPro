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
} from 'firebase/firestore';
import { db } from './config';
import {
  apartmentsCollection,
  apartmentDoc,
  buildingDoc,
} from './firestore';
import type { ApartmentFormData } from '@/lib/validators/apartment';
import type { ApartmentStatus } from '@/lib/types/models';
import { addAuditEntry } from '@/lib/utils/audit';

interface CreateApartmentParams {
  data: ApartmentFormData;
  userId: string;
  userName: string;
}

export async function createApartment({ data, userId, userName }: CreateApartmentParams) {
  const batch = writeBatch(db);
  const now = Timestamp.now();

  // Create apartment document
  const aptRef = apartmentsCollection;
  const newAptRef = await addDoc(aptRef, {
    ...data,
    status: 'vacant' as const,
    createdAt: now,
    createdBy: userId,
    updatedAt: now,
    updatedBy: userId,
  });

  // Update building counts
  const bldgRef = buildingDoc(data.buildingId);
  batch.update(bldgRef, {
    apartmentCount: increment(1),
    vacantCount: increment(1),
    updatedAt: now,
    updatedBy: userId,
  });

  await batch.commit();

  await addAuditEntry({
    userId,
    userName,
    action: 'create',
    entityType: 'apartments',
    entityId: newAptRef.id,
    details: { buildingId: data.buildingId, unitNumber: data.unitNumber },
  });

  return newAptRef.id;
}

interface UpdateApartmentParams {
  apartmentId: string;
  data: Partial<Omit<ApartmentFormData, 'buildingId'>>;
  userId: string;
  userName: string;
}

export async function updateApartment({ apartmentId, data, userId, userName }: UpdateApartmentParams) {
  const ref = apartmentDoc(apartmentId);
  await updateDoc(ref, {
    ...data,
    updatedAt: Timestamp.now(),
    updatedBy: userId,
  });

  await addAuditEntry({
    userId,
    userName,
    action: 'update',
    entityType: 'apartments',
    entityId: apartmentId,
    details: data,
  });
}

interface ChangeApartmentStatusParams {
  apartmentId: string;
  buildingId: string;
  oldStatus: ApartmentStatus;
  newStatus: ApartmentStatus;
  userId: string;
  userName: string;
}

export async function changeApartmentStatus({
  apartmentId,
  buildingId,
  oldStatus,
  newStatus,
  userId,
  userName,
}: ChangeApartmentStatusParams) {
  const batch = writeBatch(db);
  const now = Timestamp.now();

  // Update apartment status
  batch.update(apartmentDoc(apartmentId), {
    status: newStatus,
    updatedAt: now,
    updatedBy: userId,
  });

  // Adjust building counts
  const bldgRef = buildingDoc(buildingId);
  const countField = (status: ApartmentStatus) => {
    switch (status) {
      case 'vacant': return 'vacantCount';
      case 'occupied': return 'occupiedCount';
      case 'under_maintenance': return 'maintenanceCount';
    }
  };

  batch.update(bldgRef, {
    [countField(oldStatus)]: increment(-1),
    [countField(newStatus)]: increment(1),
    updatedAt: now,
    updatedBy: userId,
  });

  await batch.commit();

  await addAuditEntry({
    userId,
    userName,
    action: 'status_change',
    entityType: 'apartments',
    entityId: apartmentId,
    details: { oldStatus, newStatus, buildingId },
  });
}

export function getApartmentsByBuildingQuery(buildingId: string) {
  return query(
    apartmentsCollection,
    where('buildingId', '==', buildingId),
    orderBy('unitNumber')
  );
}

export async function checkUnitNumberExists(buildingId: string, unitNumber: string): Promise<boolean> {
  const q = query(
    apartmentsCollection,
    where('buildingId', '==', buildingId),
    where('unitNumber', '==', unitNumber)
  );
  const snap = await getDocs(q);
  return !snap.empty;
}
