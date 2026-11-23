import { z } from 'zod';

const unsignedInteger = z.string().regex(/^\d+$/).transform(Number);

export const listExpensesSchema = z.strictObject({
  limit: unsignedInteger.pipe(z.int().min(1).max(100)).default(20),
  offset: unsignedInteger.pipe(z.int().min(0).max(2_147_483_647)).default(0),
});

export type ListExpensesDto = z.infer<typeof listExpensesSchema>;
