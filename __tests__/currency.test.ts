import { describe, it, expect } from 'vitest';
import { formatCurrency, formatCurrencyCompact } from '@/lib/utils/currency';

describe('formatCurrency', () => {
  it('formats with Arabic symbol for ar locale', () => {
    const result = formatCurrency(1000, 'ar');
    expect(result).toContain('ر.س');
  });

  it('formats with SAR symbol for en locale', () => {
    const result = formatCurrency(1000, 'en');
    expect(result).toContain('SAR');
  });

  it('includes 2 decimal places', () => {
    const result = formatCurrency(1000, 'en');
    expect(result).toContain('1,000.00');
  });

  it('defaults to ar locale', () => {
    const result = formatCurrency(500);
    expect(result).toContain('ر.س');
  });

  it('formats zero correctly', () => {
    const result = formatCurrency(0, 'en');
    expect(result).toContain('0.00');
    expect(result).toContain('SAR');
  });

  it('formats negative amounts', () => {
    const result = formatCurrency(-500, 'en');
    expect(result).toContain('500');
    expect(result).toContain('SAR');
  });
});

describe('formatCurrencyCompact', () => {
  it('uses compact notation for large numbers', () => {
    const result = formatCurrencyCompact(1500000, 'en');
    expect(result).toContain('SAR');
    // Compact format should abbreviate (e.g., 1.5M or 2M)
    expect(result.length).toBeLessThan(formatCurrency(1500000, 'en').length);
  });

  it('formats with Arabic symbol for ar locale', () => {
    const result = formatCurrencyCompact(1000, 'ar');
    expect(result).toContain('ر.س');
  });
});
