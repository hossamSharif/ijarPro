import type { JournalLine } from '@/lib/types/accounting';

export interface BalanceResult {
  valid: boolean;
  totalDebits: number;
  totalCredits: number;
  difference: number;
}

export function validateBalance(lines: JournalLine[]): BalanceResult {
  const totalDebits = lines.reduce((sum, line) => sum + line.debit, 0);
  const totalCredits = lines.reduce((sum, line) => sum + line.credit, 0);
  const difference = Math.abs(totalDebits - totalCredits);

  return {
    valid: difference < 0.01,
    totalDebits: Math.round(totalDebits * 100) / 100,
    totalCredits: Math.round(totalCredits * 100) / 100,
    difference: Math.round(difference * 100) / 100,
  };
}
