'use client';

import {
  getDoc,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { companyRef } from './firestore';
import type { CompanyFormData } from '@/lib/validators/company';
import { addAuditEntry } from '@/lib/utils/audit';

export async function getCompanyProfile() {
  const snap = await getDoc(companyRef);
  if (snap.exists()) {
    return snap.data();
  }
  return null;
}

interface UpdateCompanyParams {
  data: CompanyFormData;
  userId: string;
  userName: string;
}

export async function updateCompanyProfile({ data, userId, userName }: UpdateCompanyParams) {
  const now = Timestamp.now();

  await setDoc(
    companyRef,
    {
      ...data,
      updatedAt: now,
      updatedBy: userId,
    },
    { merge: true }
  );

  // Ensure createdAt/createdBy exist on first write
  const snap = await getDoc(companyRef);
  if (snap.exists() && !snap.data().createdAt) {
    await setDoc(
      companyRef,
      {
        createdAt: now,
        createdBy: userId,
      },
      { merge: true }
    );
  }

  await addAuditEntry({
    userId,
    userName,
    action: 'update',
    entityType: 'company',
    entityId: 'profile',
    details: {
      nameAr: data.nameAr,
      nameEn: data.nameEn,
      vatNumber: data.vatNumber,
      crNumber: data.crNumber,
    },
  });
}
