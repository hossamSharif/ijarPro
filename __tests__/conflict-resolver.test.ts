import { describe, it, expect, vi } from 'vitest';

// Mock Firebase modules before importing anything that depends on them
vi.mock('@/lib/firebase/config', () => ({
  db: {},
  auth: {},
  storage: {},
  app: {},
}));

vi.mock('@/lib/utils/audit', () => ({
  addAuditEntry: vi.fn(),
}));

import { resolveConflict, createConflictAuditDetails, type ConflictInfo } from '@/lib/sync/conflict-resolver';

describe('resolveConflict (LWW)', () => {
  it('server wins when server timestamp is newer', () => {
    expect(resolveConflict(1000, 2000)).toBe('server_wins');
  });

  it('server wins when timestamps are equal', () => {
    expect(resolveConflict(1000, 1000)).toBe('server_wins');
  });

  it('local wins when local timestamp is newer', () => {
    expect(resolveConflict(2000, 1000)).toBe('local_wins');
  });
});

describe('createConflictAuditDetails', () => {
  it('creates audit details with correct action', () => {
    const conflict: ConflictInfo = {
      entityType: 'invoice',
      entityId: 'INV-001',
      localTimestamp: 1000,
      serverTimestamp: 2000,
      resolution: 'server_wins',
    };
    const result = createConflictAuditDetails(conflict);
    expect(result.action).toBe('sync_conflict');
  });

  it('includes all conflict info in details', () => {
    const conflict: ConflictInfo = {
      entityType: 'customer',
      entityId: 'CUST-123',
      localTimestamp: 5000,
      serverTimestamp: 3000,
      resolution: 'local_wins',
    };
    const result = createConflictAuditDetails(conflict);
    expect(result.details.entityType).toBe('customer');
    expect(result.details.entityId).toBe('CUST-123');
    expect(result.details.resolution).toBe('local_wins');
  });
});
