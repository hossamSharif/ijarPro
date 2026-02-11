import { z } from 'zod';

export const lineItemSchema = z.object({
  descriptionAr: z.string().min(1).max(500),
  descriptionEn: z.string().min(1).max(500),
  quantity: z.number().min(1),
  unitPrice: z.number().min(0),
  amount: z.number().min(0),
});

export const invoiceSchema = z.object({
  customerId: z.string().min(1),
  apartmentId: z.string().min(1),
  buildingId: z.string().min(1),
  invoiceDate: z.date(),
  supplyDate: z.date(),
  rentalPeriodStart: z.date(),
  rentalPeriodEnd: z.date(),
  lineItems: z.array(lineItemSchema).min(1),
  vatRate: z.number().min(0).max(100),
});

export const paymentSchema = z.object({
  amount: z.number().min(0.01),
});

export const cancellationSchema = z.object({
  reason: z.string().min(1).max(500),
});

export type InvoiceFormData = z.infer<typeof invoiceSchema>;
export type PaymentFormData = z.infer<typeof paymentSchema>;
export type CancellationFormData = z.infer<typeof cancellationSchema>;
