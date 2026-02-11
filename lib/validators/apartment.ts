import { z } from 'zod';

export const apartmentSchema = z.object({
  buildingId: z.string().min(1),
  unitNumber: z.string().min(1).max(20),
  floor: z.number().int().min(0),
  rooms: z.number().int().min(1),
  areaSqm: z.number().min(1),
  monthlyRent: z.number().min(0),
  description: z.string().max(1000).optional(),
});

export type ApartmentFormData = z.infer<typeof apartmentSchema>;
