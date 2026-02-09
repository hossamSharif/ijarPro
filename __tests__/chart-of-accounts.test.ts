import { describe, it, expect } from 'vitest';
import {
  CHART_OF_ACCOUNTS,
  getAccountByCode,
  getAccountsByType,
  getChildAccounts,
} from '@/lib/accounting/chart-of-accounts';

describe('CHART_OF_ACCOUNTS', () => {
  it('has all 5 main categories', () => {
    const level1 = CHART_OF_ACCOUNTS.filter((a) => a.level === 1);
    expect(level1).toHaveLength(5);
  });

  it('has unique codes', () => {
    const codes = CHART_OF_ACCOUNTS.map((a) => a.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('all accounts are system and active', () => {
    for (const a of CHART_OF_ACCOUNTS) {
      expect(a.isSystem).toBe(true);
      expect(a.isActive).toBe(true);
    }
  });
});

describe('getAccountByCode', () => {
  it('returns account for valid code', () => {
    const account = getAccountByCode('1100');
    expect(account).toBeDefined();
    expect(account!.nameEn).toBe('Cash and Bank');
  });

  it('returns undefined for invalid code', () => {
    expect(getAccountByCode('9999')).toBeUndefined();
  });

  it('returns correct type for liability account', () => {
    const account = getAccountByCode('2200');
    expect(account!.type).toBe('liability');
  });
});

describe('getAccountsByType', () => {
  it('returns only asset accounts for asset type', () => {
    const assets = getAccountsByType('asset');
    expect(assets.length).toBeGreaterThan(0);
    for (const a of assets) {
      expect(a.type).toBe('asset');
    }
  });

  it('returns only expense accounts for expense type', () => {
    const expenses = getAccountsByType('expense');
    expect(expenses.length).toBeGreaterThan(0);
    for (const e of expenses) {
      expect(e.type).toBe('expense');
    }
  });
});

describe('getChildAccounts', () => {
  it('returns children of Assets (1000)', () => {
    const children = getChildAccounts('1000');
    expect(children.length).toBeGreaterThan(0);
    for (const c of children) {
      expect(c.parentCode).toBe('1000');
    }
  });

  it('returns empty for leaf accounts', () => {
    const children = getChildAccounts('1100');
    expect(children).toHaveLength(0);
  });

  it('returns empty for non-existent parent', () => {
    const children = getChildAccounts('9999');
    expect(children).toHaveLength(0);
  });
});
