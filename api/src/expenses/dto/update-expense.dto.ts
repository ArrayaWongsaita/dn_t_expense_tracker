import { z } from 'zod';
import { expenseFields } from './expense-fields.schema.js';

export const updateExpenseSchema = z
  .strictObject(expenseFields)
  .partial()
  .refine(
    (input) => Object.keys(input).length > 0,
    'Provide at least one field',
  );

export type UpdateExpenseDto = z.infer<typeof updateExpenseSchema>;
