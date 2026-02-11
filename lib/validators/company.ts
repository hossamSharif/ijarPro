import { z } from 'zod';

export const addressSchema = z.object({
  streetAr: z.string().min(2).max(500),
  streetEn: z.string().min(2).max(500),
  cityAr: z.string().min(2).max(200),
  cityEn: z.string().min(2).max(200),
  districtAr: z.string().min(2).max(200),
  districtEn: z.string().min(2).max(200),
  postalCode: z.string().min(4).max(10),
  additionalNumber: z.string().max(10).optional(),
});

export const companySchema = z.object({
  nameAr: z.string().min(2).max(200),
  nameEn: z.string().min(2).max(200),
  logoUrl: z.string().url().optional(),
  crNumber: z.string().regex(/^\d+$/, 'Must be a numeric string'),
  vatNumber: z.string().regex(/^\d{15}$/, 'Must be exactly 15 digits'),
  address: addressSchema,
  phone: z.string().regex(/^\+\d{10,15}$/, 'Must be E.164 format'),
  email: z.string().email().optional(),
  website: z.string().url().optional(),
  vatRate: z.number().min(0).max(100),
  sessionTimeout: z.number().min(5),
  expenseCategories: z.array(z.string().min(1)).min(1),
});

export type CompanyFormData = z.infer<typeof companySchema>;
