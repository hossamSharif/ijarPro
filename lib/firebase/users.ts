'use client';

import {
  getDocs,
  getDoc,
  updateDoc,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { getIdToken } from 'firebase/auth';
import { auth } from './config';
import { usersCollection, userDoc } from './firestore';
import { addAuditEntry } from '@/lib/utils/audit';
import type { User, UserPermissions } from '@/lib/types/models';
import type { CreateUserFormData } from '@/lib/validators/user';

// --- Queries ---

export async function listUsers(): Promise<(User & { id: string })[]> {
  const q = query(usersCollection, orderBy('nameAr'));
  const snap = await getDocs(q);
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export async function getUser(uid: string): Promise<(User & { id: string }) | null> {
  const snap = await getDoc(userDoc(uid));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

// --- Mutations ---

async function getAuthToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  return getIdToken(user);
}

interface CreateUserParams {
  data: CreateUserFormData;
  callerUserId: string;
  callerUserName: string;
}

export async function createUser({ data, callerUserId, callerUserName }: CreateUserParams): Promise<string> {
  const token = await getAuthToken();

  const response = await fetch('/api/users/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create user');
  }

  const { uid } = await response.json();

  await addAuditEntry({
    userId: callerUserId,
    userName: callerUserName,
    action: 'create',
    entityType: 'users',
    entityId: uid,
    details: {
      username: data.username,
      nameAr: data.nameAr,
      nameEn: data.nameEn,
      email: data.email,
      role: data.role,
    },
  });

  return uid;
}

interface UpdatePermissionsParams {
  uid: string;
  permissions: UserPermissions;
  callerUserId: string;
  callerUserName: string;
}

export async function updateUserPermissions({
  uid,
  permissions,
  callerUserId,
  callerUserName,
}: UpdatePermissionsParams): Promise<void> {
  await updateDoc(userDoc(uid), {
    permissions,
    updatedAt: Timestamp.now(),
    updatedBy: callerUserId,
  });

  await addAuditEntry({
    userId: callerUserId,
    userName: callerUserName,
    action: 'permission_change',
    entityType: 'users',
    entityId: uid,
    details: { permissions },
  });
}

interface DeactivateUserParams {
  uid: string;
  callerUserId: string;
  callerUserName: string;
}

export async function deactivateUser({
  uid,
  callerUserId,
  callerUserName,
}: DeactivateUserParams): Promise<void> {
  const token = await getAuthToken();

  const response = await fetch('/api/users/deactivate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ uid }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to deactivate user');
  }

  await addAuditEntry({
    userId: callerUserId,
    userName: callerUserName,
    action: 'account_deactivate',
    entityType: 'users',
    entityId: uid,
  });
}

interface ActivateUserParams {
  uid: string;
  callerUserId: string;
  callerUserName: string;
}

export async function activateUser({
  uid,
  callerUserId,
  callerUserName,
}: ActivateUserParams): Promise<void> {
  const token = await getAuthToken();

  const response = await fetch('/api/users/activate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ uid }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to activate user');
  }

  await addAuditEntry({
    userId: callerUserId,
    userName: callerUserName,
    action: 'account_activate',
    entityType: 'users',
    entityId: uid,
  });
}
