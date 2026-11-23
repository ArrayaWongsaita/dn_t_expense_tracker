import { Test } from '@nestjs/testing';
import { ArgonService } from './argon.service.js';

async function createService(): Promise<ArgonService> {
  const module = await Test.createTestingModule({
    providers: [ArgonService],
  }).compile();
  return module.get(ArgonService);
}

describe('ArgonService', () => {
  const password = 'correct horse battery staple';

  it('stores a password as an argon2id hash, never as plain text', async () => {
    const argon = await createService();

    const hash = await argon.hash(password);

    expect(hash).not.toBe(password);
    expect(hash.startsWith('$argon2id$')).toBe(true);
  });

  it('accepts the password it hashed', async () => {
    const argon = await createService();
    const hash = await argon.hash(password);

    await expect(argon.verify(password, hash)).resolves.toBe(true);
  });

  it('rejects a different password', async () => {
    const argon = await createService();
    const hash = await argon.hash(password);

    await expect(argon.verify('wrong password', hash)).resolves.toBe(false);
  });

  it('rejects when there is no stored hash', async () => {
    const argon = await createService();

    await expect(argon.verify(password, undefined)).resolves.toBe(false);
  });

  it('rejects a stored hash that cannot be verified', async () => {
    const argon = await createService();

    await expect(
      argon.verify(password, '$argon2id$not-a-real-hash'),
    ).resolves.toBe(false);
  });
});
