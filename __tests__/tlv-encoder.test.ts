import { describe, it, expect } from 'vitest';
import { encodeTlv, encodeTlvBase64 } from '@/lib/zatca/tlv-encoder';
import type { ZatcaTlvData } from '@/lib/types/zatca';

const sampleData: ZatcaTlvData = {
  sellerName: 'شركة إيجار',
  vatNumber: '300000000000003',
  timestamp: '2024-01-15T10:30:00Z',
  totalWithVat: '1150.00',
  vatAmount: '150.00',
};

describe('encodeTlv', () => {
  it('produces Uint8Array output', () => {
    const result = encodeTlv(sampleData);
    expect(result).toBeInstanceOf(Uint8Array);
  });

  it('starts with tag 1 for seller name', () => {
    const result = encodeTlv(sampleData);
    expect(result[0]).toBe(1);
  });

  it('encodes all 5 tags in order (1-5)', () => {
    const result = encodeTlv(sampleData);
    let offset = 0;
    for (let tag = 1; tag <= 5; tag++) {
      expect(result[offset]).toBe(tag);
      const len = result[offset + 1];
      offset += 2 + len;
    }
    expect(offset).toBe(result.length);
  });

  it('encodes Arabic text as UTF-8', () => {
    const result = encodeTlv(sampleData);
    // Tag 1, then length byte, then UTF-8 encoded Arabic
    const length = result[1];
    const arabicBytes = result.slice(2, 2 + length);
    const decoded = new TextDecoder().decode(arabicBytes);
    expect(decoded).toBe('شركة إيجار');
  });

  it('encodes VAT number correctly', () => {
    const result = encodeTlv(sampleData);
    // Skip tag 1
    const offset = 2 + result[1];
    // Tag 2
    expect(result[offset]).toBe(2);
    const len = result[offset + 1];
    const vatBytes = result.slice(offset + 2, offset + 2 + len);
    const decoded = new TextDecoder().decode(vatBytes);
    expect(decoded).toBe('300000000000003');
  });
});

describe('encodeTlvBase64', () => {
  it('returns a valid Base64 string', () => {
    const result = encodeTlvBase64(sampleData);
    expect(typeof result).toBe('string');
    // Verify it decodes back
    expect(() => atob(result)).not.toThrow();
  });

  it('encodes deterministically', () => {
    const result1 = encodeTlvBase64(sampleData);
    const result2 = encodeTlvBase64(sampleData);
    expect(result1).toBe(result2);
  });

  it('produces non-empty output', () => {
    const result = encodeTlvBase64(sampleData);
    expect(result.length).toBeGreaterThan(0);
  });
});
