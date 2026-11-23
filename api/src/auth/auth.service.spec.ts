import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { ArgonService } from '../hasher/argon.service.js';
import { UserService } from '../user/user.service.js';
import { ACCESS_TOKEN_TTL_SECONDS } from './auth.constants.js';
import { AuthService } from './auth.service.js';

const storedUser = {
  id: 'user-1',
  email: 'ada@example.com',
  passwordHash: 'hashed-password',
  createdAt: new Date('2026-11-22T10:00:00.000Z'),
};

function createFakes() {
  return {
    users: {
      createAccount: vi.fn(),
      findByEmail: vi.fn(),
      findAuthenticated: vi.fn(),
    },
    argon: { hash: vi.fn(), verify: vi.fn() },
    jwt: { signAsync: vi.fn() },
  };
}

async function createService(fakes: ReturnType<typeof createFakes>) {
  const module = await Test.createTestingModule({ providers: [AuthService] })
    .useMocker((token) => {
      if (token === UserService) return fakes.users;
      if (token === ArgonService) return fakes.argon;
      if (token === JwtService) return fakes.jwt;
      return undefined;
    })
    .compile();
  return module.get(AuthService);
}

describe('AuthService', () => {
  it('returns the account created by the user service', async () => {
    const fakes = createFakes();
    const account = {
      id: 'user-1',
      email: 'ada@example.com',
      createdAt: '2026-11-22T10:00:00.000Z',
    };
    fakes.users.createAccount.mockResolvedValue(account);
    const service = await createService(fakes);

    await expect(
      service.signup({
        email: 'ada@example.com',
        password: 'correct horse battery',
      }),
    ).resolves.toEqual(account);
  });

  it('issues a token for the signed-in account', async () => {
    const fakes = createFakes();
    fakes.users.findByEmail.mockResolvedValue(storedUser);
    fakes.argon.verify.mockResolvedValue(true);
    fakes.jwt.signAsync.mockResolvedValue('signed-token');
    const service = await createService(fakes);

    await expect(
      service.login({ email: 'ada@example.com', password: 'plain' }),
    ).resolves.toEqual({
      accessToken: 'signed-token',
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    });

    expect(fakes.jwt.signAsync).toHaveBeenCalledWith({
      sub: 'user-1',
      email: 'ada@example.com',
    });
  });

  it('answers the same for an unknown email and a wrong password', async () => {
    const unknownEmail = createFakes();
    unknownEmail.users.findByEmail.mockResolvedValue(null);
    const wrongPassword = createFakes();
    wrongPassword.users.findByEmail.mockResolvedValue(storedUser);
    wrongPassword.argon.verify.mockResolvedValue(false);

    const expected = new UnauthorizedException('Invalid email or password');
    await expect(
      (await createService(unknownEmail)).login({
        email: 'nobody@example.com',
        password: 'plain',
      }),
    ).rejects.toThrow(expected);
    await expect(
      (await createService(wrongPassword)).login({
        email: 'ada@example.com',
        password: 'plain',
      }),
    ).rejects.toThrow(expected);
  });
});
