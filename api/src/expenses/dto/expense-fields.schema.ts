import { z } from 'zod';

export const expenseFields = {
  title: z.string().trim().min(1).max(120),
  amount: z
    .string()
    .regex(/^(?:0|[1-9]\d{0,9})\.\d{2}$/)
    .refine((amount) => amount !== '0.00', 'Amount must be positive'),
  spentOn: z.iso
    .date()
    .refine((date) => !date.startsWith('0000'), 'Year must be at least 0001'),
  note: z.string().trim().min(1).max(500).nullable(),
};
