import { describe, it, expect } from 'vitest';
import { validateBalance } from '@/lib/accounting/balance-validator';
import type { JournalLine } from '@/lib/types/accounting';

function line(debit: number, credit: number): JournalLine {
  return { accountId: 'X', accountNameAr: '', accountNameEn: '', debit, credit };
}

describe('validateBalance', () => {
  it('returns valid for balanced entries', () => {
    const result = validateBalance([line(100, 0), line(0, 100)]);
    expect(result.valid).toBe(true);
    expect(result.totalDebits).toBe(100);
    expect(result.totalCredits).toBe(100);
    expect(result.difference).toBe(0);
  });

  it('returns invalid for unbalanced entries', () => {
    const result = validateBalance([line(100, 0), line(0, 50)]);
    expect(result.valid).toBe(false);
    expect(result.difference).toBe(50);
  });

  it('handles empty array', () => {
    const result = validateBalance([]);
    expect(result.valid).toBe(true);
    expect(result.totalDebits).toBe(0);
    expect(result.totalCredits).toBe(0);
  });

  it('tolerates floating-point imprecision within 0.01', () => {
    // 0.1 + 0.2 !== 0.3 in floating point
    const result = validateBalance([line(0.1, 0), line(0.2, 0), line(0, 0.3)]);
    expect(result.valid).toBe(true);
  });

  it('rejects difference of exactly 0.01', () => {
    const result = validateBalance([line(100.01, 0), line(0, 100)]);
    expect(result.valid).toBe(false);
    expect(result.difference).toBe(0.01);
  });

  it('handles multiple lines summing correctly', () => {
    const lines = [
      line(500, 0),
      line(115, 0),
      line(0, 500),
      line(0, 115),
    ];
    const result = validateBalance(lines);
    expect(result.valid).toBe(true);
    expect(result.totalDebits).toBe(615);
    expect(result.totalCredits).toBe(615);
  });

  it('rounds totals to 2 decimal places', () => {
    const result = validateBalance([line(33.333, 0), line(0, 33.333)]);
    expect(result.totalDebits).toBe(33.33);
    expect(result.totalCredits).toBe(33.33);
  });
});
