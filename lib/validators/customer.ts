import { z } from 'zod';

export const customerSchema = z.object({
  nameAr: z.string().min(2).max(200),
  nameEn: z.string().min(2).max(200),
  nationalId: z.string().regex(/^\d{10}$/, 'Must be exactly 10 digits'),
  phone: z.string().regex(/^\+\d{10,15}$/, 'Must be E.164 format'),
  email: z.string().email().optional(),
  nationality: z.string().min(2).max(100),
  idExpiry: z.date().optional(),
  notes: z.string().max(2000).optional(),
});

export type CustomerFormData = z.infer<typeof customerSchema>;
