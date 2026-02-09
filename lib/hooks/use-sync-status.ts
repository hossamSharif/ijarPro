'use client';

import { useState, useEffect } from 'react';
import { onSnapshot, query, collection, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import {
  determineSyncState,
  PENDING_WRITES_LIMIT,
  PENDING_WRITES_WARNING_THRESHOLD,
  type SyncStatus,
} from '@/lib/sync/sync-manager';

// Track pending writes count in a module-level variable for access across components
let pendingWritesCount = 0;
const listeners = new Set<(count: number) => void>();

export function incrementPendingWrites(): void {
  pendingWritesCount++;
  listeners.forEach((fn) => fn(pendingWritesCount));
}

export function decrementPendingWrites(): void {
  if (pendingWritesCount > 0) pendingWritesCount--;
  listeners.forEach((fn) => fn(pendingWritesCount));
}

export function resetPendingWrites(): void {
  pendingWritesCount = 0;
  listeners.forEach((fn) => fn(pendingWritesCount));
}

export function getPendingWritesCount(): number {
  return pendingWritesCount;
}

export function isNearPendingLimit(): boolean {
  return pendingWritesCount >= PENDING_WRITES_WARNING_THRESHOLD;
}

export function isAtPendingLimit(): boolean {
  return pendingWritesCount >= PENDING_WRITES_LIMIT;
}

export function useSyncStatus(): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>({
    state: 'synced',
    pendingWrites: false,
    fromCache: false,
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    pendingCount: 0,
  });

  useEffect(() => {
    const handleOnline = () => setStatus((prev) => ({
      ...prev,
      online: true,
      state: determineSyncState(prev.pendingWrites, prev.fromCache, true),
    }));
    const handleOffline = () => setStatus((prev) => ({
      ...prev,
      online: false,
      state: determineSyncState(prev.pendingWrites, prev.fromCache, false),
    }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for pending count changes
    const onPendingChange = (count: number) => {
      setStatus((prev) => ({ ...prev, pendingCount: count }));
    };
    listeners.add(onPendingChange);

    const q = query(collection(db, 'auditLog'), limit(1));
    const unsub = onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snapshot) => {
        const hasPendingWrites = snapshot.metadata.hasPendingWrites;
        const fromCache = snapshot.metadata.fromCache;
        const online = navigator.onLine;

        // When we go from pending to synced, reset the counter
        if (!hasPendingWrites && !fromCache && online) {
          resetPendingWrites();
        }

        setStatus((prev) => ({
          pendingWrites: hasPendingWrites,
          fromCache,
          online,
          state: determineSyncState(hasPendingWrites, fromCache, online),
          pendingCount: prev.pendingCount,
        }));
      },
      () => {
        setStatus((prev) => ({ ...prev, state: 'error' }));
      }
    );

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      listeners.delete(onPendingChange);
      unsub();
    };
  }, []);

  return status;
}
