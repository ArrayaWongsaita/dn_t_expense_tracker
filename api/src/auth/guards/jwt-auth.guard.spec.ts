import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { UserService } from '../../user/user.service.js';
import { JWT_AUDIENCE, JWT_ISSUER } from '../auth.constants.js';
import { Public } from '../decorators/public.decorator.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

const user = { id: 'user-1', email: 'ada@example.com' };
const secret = 'x'.repeat(32);

@Public()
class PublicController {}

class ProtectedController {}

function createContext(
  authorization?: string,
  controller: object = ProtectedController,
) {
  const request: { headers: Record<string, string>; user?: typeof user } = {
    headers: authorization === undefined ? {} : { authorization },
  };
  const context = {
    getHandler: () => function handler() {},
    getClass: () => controller,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { context, request };
}

async function createGuard(options: {
  jwt?: JwtService;
  verify?: () => Promise<unknown>;
  findAuthenticated?: () => Promise<typeof user | null>;
}) {
  const verifyAsync = vi.fn(
    options.verify ?? (() => Promise.resolve({ sub: user.id })),
  );
  const jwt = options.jwt ?? ({ verifyAsync } as unknown as JwtService);
  const users = {
    findAuthenticated: vi.fn(
      options.findAuthenticated ?? (() => Promise.resolve(user)),
    ),
  };
  const module = await Test.createTestingModule({ providers: [JwtAuthGuard] })
    .useMocker((token) => {
      if (token === JwtService) return jwt;
      if (token === UserService) return users;
      return undefined;
    })
    .compile();
  return { guard: module.get(JwtAuthGuard), verifyAsync, users };
}

function realJwt(): JwtService {
  return new JwtService({
    secret,
    signOptions: {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      expiresIn: 900,
    },
  });
}

describe('JwtAuthGuard', () => {
  it('lets public routes through without reading a token', async () => {
    const { guard, verifyAsync } = await createGuard({});
    const { context } = createContext(undefined, PublicController);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(verifyAsync).not.toHaveBeenCalled();
  });

  it('rejects a request without an authorization header', async () => {
    const { guard } = await createGuard({});
    const { context } = createContext(undefined);

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a scheme that is not Bearer', async () => {
    const { guard } = await createGuard({});
    const { context } = createContext('Basic dXNlcjpwYXNz');

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects an empty Bearer token', async () => {
    const { guard } = await createGuard({});
    const { context } = createContext('Bearer ');

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects an expired or malformed token', async () => {
    const { guard } = await createGuard({
      verify: () => Promise.reject(new Error('jwt expired')),
    });
    const { context } = createContext('Bearer expired-token');

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a valid token whose user no longer exists', async () => {
    const { guard } = await createGuard({
      findAuthenticated: () => Promise.resolve(null),
    });
    const { context } = createContext('Bearer valid-token');

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('attaches the user and verifies with the app issuer and audience', async () => {
    const { guard, verifyAsync } = await createGuard({});
    const { context, request } = createContext('Bearer valid-token');

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(verifyAsync).toHaveBeenCalledWith('valid-token', {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    expect(request.user).toEqual(user);
  });
});

describe('JwtAuthGuard with tokens signed for this app', () => {
  async function sign(overrides: JwtSignOptions = {}): Promise<string> {
    return realJwt().signAsync({ sub: user.id }, overrides);
  }

  async function guardFor(token: string, scheme = 'Bearer') {
    const { guard } = await createGuard({ jwt: realJwt() });
    const { context, request } = createContext(`${scheme} ${token}`);
    return { guard, context, request };
  }

  it('accepts a token signed by this app', async () => {
    const { guard, context, request } = await guardFor(await sign());

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual(user);
  });

  it('accepts a lower-case bearer scheme', async () => {
    const { guard, context } = await guardFor(await sign(), 'bearer');

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('rejects a duplicated authorization header', async () => {
    const token = await sign();
    const { guard } = await createGuard({ jwt: realJwt() });
    const { context } = createContext(`Bearer ${token}, Bearer ${token}`);

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a token from another issuer', async () => {
    const token = await sign({ issuer: 'another-service' });
    const { guard, context } = await guardFor(token);

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a token for another audience', async () => {
    const token = await sign({ audience: 'another-client' });
    const { guard, context } = await guardFor(token);

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects an expired token', async () => {
    const token = realJwt().sign({ sub: user.id }, { expiresIn: -10 });
    const { guard, context } = await guardFor(token);

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a token without a usable subject', async () => {
    const token = realJwt().sign({ sub: '' });
    const { guard, context } = await guardFor(token);

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
