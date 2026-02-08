import type { InvoiceStatus } from '@/lib/types/models';

/**
 * Valid status transitions for invoices.
 * Key: current status → Value: allowed target statuses
 */
const VALID_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  draft: ['issued', 'cancelled'],
  issued: ['paid', 'partially_paid', 'overdue', 'cancelled'],
  partially_paid: ['paid', 'overdue', 'cancelled'],
  overdue: ['paid', 'cancelled'],
  paid: [],
  cancelled: [],
};

export interface StatusTransitionResult {
  valid: boolean;
  error?: string;
}

export function validateStatusTransition(
  currentStatus: InvoiceStatus,
  targetStatus: InvoiceStatus
): StatusTransitionResult {
  const allowed = VALID_TRANSITIONS[currentStatus];

  if (!allowed || allowed.length === 0) {
    return {
      valid: false,
      error: `Invoice with status "${currentStatus}" cannot be transitioned`,
    };
  }

  if (!allowed.includes(targetStatus)) {
    return {
      valid: false,
      error: `Cannot transition from "${currentStatus}" to "${targetStatus}"`,
    };
  }

  return { valid: true };
}

/**
 * Checks if an invoice can be updated (credit note + new debit note flow).
 * Only draft or issued invoices can be updated.
 */
export function canUpdateInvoice(status: InvoiceStatus): StatusTransitionResult {
  if (status === 'paid' || status === 'cancelled') {
    return {
      valid: false,
      error: `Cannot update invoice with status "${status}"`,
    };
  }

  if (status === 'draft' || status === 'issued') {
    return { valid: true };
  }

  return {
    valid: false,
    error: `Cannot update invoice with status "${status}". Only draft or issued invoices can be updated.`,
  };
}

/**
 * Checks if an invoice can be cancelled.
 * Cannot cancel already paid or cancelled invoices.
 */
export function canCancelInvoice(status: InvoiceStatus): StatusTransitionResult {
  if (status === 'paid') {
    return {
      valid: false,
      error: 'Cannot cancel a paid invoice',
    };
  }

  if (status === 'cancelled') {
    return {
      valid: false,
      error: 'Invoice is already cancelled',
    };
  }

  return { valid: true };
}

/**
 * Checks if a payment can be recorded on an invoice.
 * Status must be issued, partially_paid, or overdue.
 */
export function canRecordPayment(status: InvoiceStatus): StatusTransitionResult {
  const payableStatuses: InvoiceStatus[] = ['issued', 'partially_paid', 'overdue'];

  if (!payableStatuses.includes(status)) {
    return {
      valid: false,
      error: `Cannot record payment on invoice with status "${status}". Status must be issued, partially paid, or overdue.`,
    };
  }

  return { valid: true };
}

/**
 * Determines the new status after a payment is recorded.
 */
export function getPaymentResultStatus(
  paymentAmount: number,
  currentPaid: number,
  invoiceTotal: number
): InvoiceStatus {
  const totalPaid = Math.round((currentPaid + paymentAmount) * 100) / 100;

  if (totalPaid >= invoiceTotal) {
    return 'paid';
  }

  return 'partially_paid';
}
