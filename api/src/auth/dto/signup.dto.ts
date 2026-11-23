import { z } from 'zod';
import { emailSchema } from './email.schema.js';

export const signupSchema = z.strictObject({
  email: emailSchema,
  password: z.string().min(12).max(128),
});

export type SignUpDto = z.infer<typeof signupSchema>;
