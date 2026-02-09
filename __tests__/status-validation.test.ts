import { describe, it, expect } from 'vitest';
import {
  validateStatusTransition,
  canUpdateInvoice,
  canCancelInvoice,
  canRecordPayment,
  getPaymentResultStatus,
} from '@/lib/invoices/status-validation';
import type { InvoiceStatus } from '@/lib/types/models';

describe('validateStatusTransition', () => {
  it('allows draft → issued', () => {
    expect(validateStatusTransition('draft', 'issued').valid).toBe(true);
  });

  it('allows draft → cancelled', () => {
    expect(validateStatusTransition('draft', 'cancelled').valid).toBe(true);
  });

  it('rejects draft → paid', () => {
    const result = validateStatusTransition('draft', 'paid');
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('allows issued → paid', () => {
    expect(validateStatusTransition('issued', 'paid').valid).toBe(true);
  });

  it('allows issued → partially_paid', () => {
    expect(validateStatusTransition('issued', 'partially_paid').valid).toBe(true);
  });

  it('allows issued → overdue', () => {
    expect(validateStatusTransition('issued', 'overdue').valid).toBe(true);
  });

  it('rejects paid → anything', () => {
    const statuses: InvoiceStatus[] = ['draft', 'issued', 'partially_paid', 'overdue', 'cancelled'];
    for (const s of statuses) {
      expect(validateStatusTransition('paid', s).valid).toBe(false);
    }
  });

  it('rejects cancelled → anything', () => {
    const statuses: InvoiceStatus[] = ['draft', 'issued', 'paid', 'partially_paid', 'overdue'];
    for (const s of statuses) {
      expect(validateStatusTransition('cancelled', s).valid).toBe(false);
    }
  });

  it('allows overdue → paid', () => {
    expect(validateStatusTransition('overdue', 'paid').valid).toBe(true);
  });

  it('allows overdue → cancelled', () => {
    expect(validateStatusTransition('overdue', 'cancelled').valid).toBe(true);
  });

  it('rejects overdue → issued', () => {
    expect(validateStatusTransition('overdue', 'issued').valid).toBe(false);
  });
});

describe('canUpdateInvoice', () => {
  it('allows draft', () => expect(canUpdateInvoice('draft').valid).toBe(true));
  it('allows issued', () => expect(canUpdateInvoice('issued').valid).toBe(true));
  it('rejects paid', () => expect(canUpdateInvoice('paid').valid).toBe(false));
  it('rejects cancelled', () => expect(canUpdateInvoice('cancelled').valid).toBe(false));
  it('rejects partially_paid', () => expect(canUpdateInvoice('partially_paid').valid).toBe(false));
  it('rejects overdue', () => expect(canUpdateInvoice('overdue').valid).toBe(false));
});

describe('canCancelInvoice', () => {
  it('allows draft', () => expect(canCancelInvoice('draft').valid).toBe(true));
  it('allows issued', () => expect(canCancelInvoice('issued').valid).toBe(true));
  it('allows partially_paid', () => expect(canCancelInvoice('partially_paid').valid).toBe(true));
  it('allows overdue', () => expect(canCancelInvoice('overdue').valid).toBe(true));
  it('rejects paid', () => expect(canCancelInvoice('paid').valid).toBe(false));
  it('rejects cancelled', () => expect(canCancelInvoice('cancelled').valid).toBe(false));
});

describe('canRecordPayment', () => {
  it('allows issued', () => expect(canRecordPayment('issued').valid).toBe(true));
  it('allows partially_paid', () => expect(canRecordPayment('partially_paid').valid).toBe(true));
  it('allows overdue', () => expect(canRecordPayment('overdue').valid).toBe(true));
  it('rejects draft', () => expect(canRecordPayment('draft').valid).toBe(false));
  it('rejects paid', () => expect(canRecordPayment('paid').valid).toBe(false));
  it('rejects cancelled', () => expect(canRecordPayment('cancelled').valid).toBe(false));
});

describe('getPaymentResultStatus', () => {
  it('returns paid when fully paid', () => {
    expect(getPaymentResultStatus(1000, 0, 1000)).toBe('paid');
  });

  it('returns paid when overpaid', () => {
    expect(getPaymentResultStatus(600, 500, 1000)).toBe('paid');
  });

  it('returns partially_paid when partially paid', () => {
    expect(getPaymentResultStatus(500, 0, 1000)).toBe('partially_paid');
  });

  it('handles floating-point rounding', () => {
    // 0.1 + 0.2 should round to 0.30 and match 0.30
    expect(getPaymentResultStatus(0.2, 0.1, 0.3)).toBe('paid');
  });

  it('returns partially_paid for small payment', () => {
    expect(getPaymentResultStatus(0.01, 0, 1000)).toBe('partially_paid');
  });
});
