import { addDoc, Timestamp } from 'firebase/firestore';
import { auditLogCollection } from '@/lib/firebase/firestore';
import type { AuditAction } from '@/lib/types/models';

export async function addAuditEntry(params: {
  userId: string;
  userName: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  details?: Record<string, unknown>;
  syncConflict?: boolean;
}) {
  const entry: Record<string, unknown> = {
    timestamp: Timestamp.now(),
    userId: params.userId,
    userName: params.userName,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
  };
  if (params.details !== undefined) {
    // Strip undefined values from details to prevent Firestore errors
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(params.details)) {
      if (v !== undefined) cleaned[k] = v;
    }
    entry.details = cleaned;
  }
  if (params.syncConflict !== undefined) entry.syncConflict = params.syncConflict;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return addDoc(auditLogCollection, entry as any);
}
