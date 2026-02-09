'use client';

import { isAtPendingLimit, isNearPendingLimit, incrementPendingWrites } from '@/lib/hooks/use-sync-status';
import { isOnline, PENDING_WRITES_LIMIT, PENDING_WRITES_WARNING_THRESHOLD } from '@/lib/sync/sync-manager';

/**
 * Check if a write operation can proceed based on pending writes limit.
 * Throws PENDING_WRITES_LIMIT error if at the limit.
 * Returns a warning flag if near the limit.
 */
export function checkWriteAllowed(): { allowed: true; nearLimit: boolean } {
  if (isAtPendingLimit()) {
    throw new Error('PENDING_WRITES_LIMIT');
  }
  return { allowed: true, nearLimit: isNearPendingLimit() };
}

/**
 * Track a write operation for pending writes counting.
 * Call after a successful write operation when offline.
 */
export function trackOfflineWrite(): void {
  if (!isOnline()) {
    incrementPendingWrites();
  }
}
