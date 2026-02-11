import { z } from 'zod';

export const journalLineSchema = z.object({
  accountId: z.string().min(1),
  accountNameAr: z.string().min(1),
  accountNameEn: z.string().min(1),
  debit: z.number().min(0),
  credit: z.number().min(0),
  description: z.string().max(500).optional(),
});

export const journalEntrySchema = z
  .object({
    date: z.date(),
    description: z.string().min(1).max(500),
    lines: z.array(journalLineSchema).min(2),
    buildingId: z.string().optional(),
  })
  .refine(
    (data) => {
      const totalDebits = data.lines.reduce((sum, line) => sum + line.debit, 0);
      const totalCredits = data.lines.reduce((sum, line) => sum + line.credit, 0);
      return Math.abs(totalDebits - totalCredits) < 0.01;
    },
    { message: 'Total debits must equal total credits' }
  );

export type JournalEntryFormData = z.infer<typeof journalEntrySchema>;
