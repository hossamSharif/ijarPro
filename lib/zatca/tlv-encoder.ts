import type { ZatcaTlvData } from '@/lib/types/zatca';

function encodeTlvTag(tag: number, value: string): Uint8Array {
  const encoder = new TextEncoder();
  const encoded = encoder.encode(value);
  const result = new Uint8Array(2 + encoded.length);
  result[0] = tag;
  result[1] = encoded.length;
  result.set(encoded, 2);
  return result;
}

export function encodeTlv(data: ZatcaTlvData): Uint8Array {
  const tags = [
    encodeTlvTag(1, data.sellerName),
    encodeTlvTag(2, data.vatNumber),
    encodeTlvTag(3, data.timestamp),
    encodeTlvTag(4, data.totalWithVat),
    encodeTlvTag(5, data.vatAmount),
  ];

  const totalLength = tags.reduce((sum, tag) => sum + tag.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const tag of tags) {
    result.set(tag, offset);
    offset += tag.length;
  }
  return result;
}

export function encodeTlvBase64(data: ZatcaTlvData): string {
  const bytes = encodeTlv(data);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
