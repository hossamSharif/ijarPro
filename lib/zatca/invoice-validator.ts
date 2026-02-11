import type { ZatcaTlvData } from '@/lib/types/zatca';

export interface ZatcaValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateZatcaFields(data: ZatcaTlvData): ZatcaValidationResult {
  const errors: string[] = [];

  if (!data.sellerName || data.sellerName.trim().length === 0) {
    errors.push('Seller name is required');
  }

  if (!data.vatNumber || !/^\d{15}$/.test(data.vatNumber)) {
    errors.push('VAT number must be exactly 15 digits');
  }

  if (!data.timestamp) {
    errors.push('Timestamp is required');
  } else {
    const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+\-]\d{2}:\d{2}$/;
    if (!isoRegex.test(data.timestamp)) {
      errors.push('Timestamp must be ISO 8601 with timezone offset');
    }
  }

  if (!data.totalWithVat) {
    errors.push('Total with VAT is required');
  } else {
    const amountRegex = /^\d+\.\d{2}$/;
    if (!amountRegex.test(data.totalWithVat)) {
      errors.push('Total must have exactly 2 decimal places (e.g., "115.00")');
    }
  }

  if (!data.vatAmount) {
    errors.push('VAT amount is required');
  } else {
    const amountRegex = /^\d+\.\d{2}$/;
    if (!amountRegex.test(data.vatAmount)) {
      errors.push('VAT amount must have exactly 2 decimal places (e.g., "15.00")');
    }
  }

  // Check Base64 length constraint
  if (errors.length === 0) {
    const encoder = new TextEncoder();
    const totalBytes =
      2 + encoder.encode(data.sellerName).length +
      2 + encoder.encode(data.vatNumber).length +
      2 + encoder.encode(data.timestamp).length +
      2 + encoder.encode(data.totalWithVat).length +
      2 + encoder.encode(data.vatAmount).length;
    const base64Length = Math.ceil(totalBytes / 3) * 4;
    if (base64Length > 500) {
      errors.push(`QR Base64 would be ${base64Length} chars (max 500)`);
    }
  }

  return { valid: errors.length === 0, errors };
}
