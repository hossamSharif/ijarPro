import type { AuditAction } from '@/lib/types/models';
import { addAuditEntry } from '@/lib/utils/audit';

export interface ConflictInfo {
  entityType: string;
  entityId: string;
  localTimestamp: number;
  serverTimestamp: number;
  resolution: 'server_wins' | 'local_wins';
}

export function resolveConflict(
  localTimestamp: number,
  serverTimestamp: number
): 'server_wins' | 'local_wins' {
  // LWW: Last Write Wins — whoever wrote later takes priority
  return serverTimestamp >= localTimestamp ? 'server_wins' : 'local_wins';
}

export function createConflictAuditDetails(conflict: ConflictInfo): {
  action: AuditAction;
  details: Record<string, unknown>;
} {
  return {
    action: 'sync_conflict',
    details: {
      entityType: conflict.entityType,
      entityId: conflict.entityId,
      localTimestamp: conflict.localTimestamp,
      serverTimestamp: conflict.serverTimestamp,
      resolution: conflict.resolution,
    },
  };
}

/**
 * Detect and log a sync conflict when server data overwrites local pending writes.
 * Firestore uses LWW by default — this function logs the conflict for audit trail.
 *
 * Call this when a snapshot transitions from hasPendingWrites=true to hasPendingWrites=false
 * and the returned data differs from what was locally written.
 */
export async function detectAndLogConflict(params: {
  entityType: string;
  entityId: string;
  localUpdatedAt: number;
  serverUpdatedAt: number;
  userId: string;
  userName: string;
  localData?: Record<string, unknown>;
  serverData?: Record<string, unknown>;
}): Promise<ConflictInfo | null> {
  const { entityType, entityId, localUpdatedAt, serverUpdatedAt, userId, userName } = params;

  // Only a conflict if timestamps differ (server overwrote local)
  if (localUpdatedAt === serverUpdatedAt) {
    return null;
  }

  const resolution = resolveConflict(localUpdatedAt, serverUpdatedAt);

  const conflict: ConflictInfo = {
    entityType,
    entityId,
    localTimestamp: localUpdatedAt,
    serverTimestamp: serverUpdatedAt,
    resolution,
  };

  const auditData = createConflictAuditDetails(conflict);

  await addAuditEntry({
    userId,
    userName,
    action: auditData.action,
    entityType,
    entityId,
    details: {
      ...auditData.details,
      localData: params.localData,
      serverData: params.serverData,
    },
    syncConflict: true,
  });

  return conflict;
}
