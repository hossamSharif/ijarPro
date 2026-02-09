'use client';

export type SyncState = 'synced' | 'syncing' | 'offline' | 'pending' | 'error';

export interface SyncStatus {
  state: SyncState;
  pendingWrites: boolean;
  fromCache: boolean;
  online: boolean;
  pendingCount: number;
}

export const PENDING_WRITES_LIMIT = 500;
export const PENDING_WRITES_WARNING_THRESHOLD = 400;

export function determineSyncState(
  hasPendingWrites: boolean,
  fromCache: boolean,
  online: boolean
): SyncState {
  if (!online) return 'offline';
  if (hasPendingWrites && !fromCache) return 'syncing';
  if (hasPendingWrites && fromCache) return 'pending';
  if (!hasPendingWrites && fromCache) return 'offline';
  return 'synced';
}

export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

export function canPerformTransaction(): boolean {
  return isOnline();
}
