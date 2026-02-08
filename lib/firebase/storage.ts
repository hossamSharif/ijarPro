'use client';

import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { storage } from './config';

export async function uploadReceipt(file: File, path: string): Promise<string> {
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export async function getFileUrl(path: string): Promise<string> {
  const storageRef = ref(storage, path);
  return getDownloadURL(storageRef);
}

export async function deleteFile(path: string): Promise<void> {
  const storageRef = ref(storage, path);
  return deleteObject(storageRef);
}

export async function uploadCompanyLogo(file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'png';
  const path = `logos/company-logo.${ext}`;
  return uploadReceipt(file, path);
}

export { storage };
