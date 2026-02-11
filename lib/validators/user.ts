import { z } from 'zod';

export const userPermissionsSchema = z.object({
  canCreateInvoice: z.boolean(),
  canUpdateInvoice: z.boolean(),
  canCancelInvoice: z.boolean(),
  canRecordPayment: z.boolean(),
  canManageBuildings: z.boolean(),
  canManageCustomers: z.boolean(),
  canAddExpense: z.boolean(),
  canViewJournal: z.boolean(),
  canCreateManualEntry: z.boolean(),
  canViewReports: z.boolean(),
  canChangeOwnPassword: z.boolean(),
});

export const createUserSchema = z.object({
  username: z.string().min(3).max(50),
  nameAr: z.string().min(2).max(100),
  nameEn: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().regex(/^\+\d{10,15}$/, 'Must be E.164 format').optional(),
  password: z.string().min(8).max(100),
  role: z.enum(['admin', 'user']),
});

export const updateUserPermissionsSchema = z.object({
  permissions: userPermissionsSchema,
});

export type CreateUserFormData = z.infer<typeof createUserSchema>;
export type UpdateUserPermissionsFormData = z.infer<typeof updateUserPermissionsSchema>;
