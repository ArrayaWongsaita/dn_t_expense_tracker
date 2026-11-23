import { envSchema } from './config.schema.js';

const validEnv = {
  DATABASE_URL: 'postgresql://user:pass@127.0.0.1:5432/expense_tracker',
  JWT_SECRET: 'x'.repeat(32),
};

describe('envSchema', () => {
  it('accepts a postgres url and a 32-byte secret', () => {
    expect(envSchema.safeParse(validEnv).success).toBe(true);
  });

  it('rejects a secret shorter than 32 bytes', () => {
    const env = { ...validEnv, JWT_SECRET: 'short' };

    expect(envSchema.safeParse(env).success).toBe(false);
  });

  it('rejects a database url that is not postgres', () => {
    const env = { ...validEnv, DATABASE_URL: 'mysql://user:pass@localhost/db' };

    expect(envSchema.safeParse(env).success).toBe(false);
  });

  it('rejects a missing database url', () => {
    const env = { JWT_SECRET: validEnv.JWT_SECRET };

    expect(envSchema.safeParse(env).success).toBe(false);
  });
});
