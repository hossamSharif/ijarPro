import { z } from 'zod';

export const buildingSchema = z.object({
  nameAr: z.string().min(2).max(200),
  nameEn: z.string().min(2).max(200),
  address: z.string().min(5).max(500),
  floors: z.number().int().min(1).max(200),
  description: z.string().max(1000).optional(),
});

export type BuildingFormData = z.infer<typeof buildingSchema>;
