import { ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ArgonService } from '../hasher/argon.service.js';
import { UserRepository } from './user.repository.js';
import { UserService } from './user.service.js';

const createdAt = new Date('2026-11-22T10:00:00.000Z');
const storedUser = {
  id: 'user-1',
  email: 'ada@example.com',
  passwordHash: 'hashed-password',
  createdAt,
};

function createFakes() {
  const users = {
    findByEmail: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
  };
  const argon = { hash: vi.fn(), verify: vi.fn() };
  return { users, argon };
}

async function createService(fakes: ReturnType<typeof createFakes>) {
  const module = await Test.createTestingModule({ providers: [UserService] })
    .useMocker((token) => {
      if (token === UserRepository) return fakes.users;
      if (token === ArgonService) return fakes.argon;
      return undefined;
    })
    .compile();
  return module.get(UserService);
}

describe('UserService', () => {
  it('hashes the password before writing the account', async () => {
    const fakes = createFakes();
    fakes.argon.hash.mockResolvedValue('hashed-password');
    fakes.users.create.mockResolvedValue(storedUser);
    const service = await createService(fakes);

    await service.createAccount({
      email: 'ada@example.com',
      password: 'plain',
    });

    expect(fakes.argon.hash).toHaveBeenCalledWith('plain');
    expect(fakes.users.create).toHaveBeenCalledWith({
      email: 'ada@example.com',
      passwordHash: 'hashed-password',
    });
  });

  it('returns the public account shape with an ISO timestamp', async () => {
    const fakes = createFakes();
    fakes.argon.hash.mockResolvedValue('hashed-password');
    fakes.users.create.mockResolvedValue(storedUser);
    const service = await createService(fakes);

    const account = await service.createAccount({
      email: 'ada@example.com',
      password: 'plain',
    });

    expect(account).toEqual({
      id: 'user-1',
      email: 'ada@example.com',
      createdAt: '2026-11-22T10:00:00.000Z',
    });
  });

  it('raises a conflict when the email is already taken', async () => {
    const fakes = createFakes();
    fakes.argon.hash.mockResolvedValue('hashed-password');
    fakes.users.create.mockResolvedValue(null);
    const service = await createService(fakes);

    await expect(
      service.createAccount({ email: 'ada@example.com', password: 'plain' }),
    ).rejects.toThrow(new ConflictException('Email already registered'));
  });

  it('returns null when an authenticated user no longer exists', async () => {
    const fakes = createFakes();
    fakes.users.findById.mockResolvedValue(null);
    const service = await createService(fakes);

    await expect(service.findAuthenticated('deleted-user')).resolves.toBeNull();
  });
});
