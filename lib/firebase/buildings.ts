'use client';

import {
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import {
  buildingsCollection,
  buildingDoc,
} from './firestore';
import type { BuildingFormData } from '@/lib/validators/building';
import { addAuditEntry } from '@/lib/utils/audit';
import { checkWriteAllowed, trackOfflineWrite } from '@/lib/sync/write-guard';

interface CreateBuildingParams {
  data: BuildingFormData;
  userId: string;
  userName: string;
}

export async function createBuilding({ data, userId, userName }: CreateBuildingParams) {
  checkWriteAllowed();
  const now = Timestamp.now();
  const docRef = await addDoc(buildingsCollection, {
    ...data,
    status: 'active' as const,
    apartmentCount: 0,
    occupiedCount: 0,
    vacantCount: 0,
    maintenanceCount: 0,
    createdAt: now,
    createdBy: userId,
    updatedAt: now,
    updatedBy: userId,
  });

  await addAuditEntry({
    userId,
    userName,
    action: 'create',
    entityType: 'buildings',
    entityId: docRef.id,
    details: { nameAr: data.nameAr, nameEn: data.nameEn },
  });

  trackOfflineWrite();
  return docRef.id;
}

interface UpdateBuildingParams {
  buildingId: string;
  data: Partial<BuildingFormData>;
  userId: string;
  userName: string;
}

export async function updateBuilding({ buildingId, data, userId, userName }: UpdateBuildingParams) {
  const ref = buildingDoc(buildingId);
  await updateDoc(ref, {
    ...data,
    updatedAt: Timestamp.now(),
    updatedBy: userId,
  });

  await addAuditEntry({
    userId,
    userName,
    action: 'update',
    entityType: 'buildings',
    entityId: buildingId,
    details: data,
  });
}

interface DeactivateBuildingParams {
  buildingId: string;
  userId: string;
  userName: string;
}

export async function deactivateBuilding({ buildingId, userId, userName }: DeactivateBuildingParams) {
  const ref = buildingDoc(buildingId);
  await updateDoc(ref, {
    status: 'inactive',
    updatedAt: Timestamp.now(),
    updatedBy: userId,
  });

  await addAuditEntry({
    userId,
    userName,
    action: 'status_change',
    entityType: 'buildings',
    entityId: buildingId,
    details: { status: 'inactive' },
  });
}

export async function reactivateBuilding({ buildingId, userId, userName }: DeactivateBuildingParams) {
  const ref = buildingDoc(buildingId);
  await updateDoc(ref, {
    status: 'active',
    updatedAt: Timestamp.now(),
    updatedBy: userId,
  });

  await addAuditEntry({
    userId,
    userName,
    action: 'status_change',
    entityType: 'buildings',
    entityId: buildingId,
    details: { status: 'active' },
  });
}

export function getActiveBuildingsQuery() {
  return query(buildingsCollection, where('status', '==', 'active'), orderBy('nameAr'));
}

export function getAllBuildingsQuery() {
  return query(buildingsCollection, orderBy('nameAr'));
}
