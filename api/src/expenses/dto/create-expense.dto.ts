import { z } from 'zod';
import { expenseFields } from './expense-fields.schema.js';

export const createExpenseSchema = z.strictObject({
  ...expenseFields,
  note: expenseFields.note.default(null),
});

export type CreateExpenseDto = z.infer<typeof createExpenseSchema>;
