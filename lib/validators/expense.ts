import { z } from 'zod';

export const expenseSchema = z.object({
  date: z.date(),
  category: z.string().min(1),
  amount: z.number().min(0.01),
  vatAmount: z.number().min(0).optional(),
  description: z.string().min(1).max(1000),
  buildingId: z.string().optional(),
  apartmentId: z.string().optional(),
});

export type ExpenseFormData = z.infer<typeof expenseSchema>;
