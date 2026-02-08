import { Timestamp } from 'firebase/firestore';
import type { InvoiceStatus, StatusChange } from '@/lib/types/models';

/**
 * Creates a new StatusChange entry for the invoice's statusHistory array.
 */
export function createStatusChange(
  status: InvoiceStatus,
  userId: string,
  note?: string
): StatusChange {
  return {
    status,
    timestamp: Timestamp.now(),
    userId,
    note,
  };
}
