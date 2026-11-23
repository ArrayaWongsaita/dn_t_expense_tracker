import { z } from 'zod';

export const envSchema = z.object({
  DATABASE_URL: z.url({ protocol: /^postgres(?:ql)?$/ }),
  JWT_SECRET: z
    .string()
    .refine((value) => Buffer.byteLength(value, 'utf8') >= 32, {
      message: 'JWT_SECRET must contain at least 32 bytes',
    }),
});

export type Env = z.infer<typeof envSchema>;
