import { UnauthorizedException } from '@nestjs/common';
import { resolveCurrentUser } from './current-user.decorator.js';

const user = { id: 'user-1', email: 'ada@example.com' };

describe('CurrentUser', () => {
  it('returns the authenticated user', () => {
    expect(resolveCurrentUser({ user })).toEqual(user);
  });

  it('returns one property of the authenticated user', () => {
    expect(resolveCurrentUser({ user }, 'id')).toBe('user-1');
  });

  it('rejects a request that has no authenticated user', () => {
    expect(() => resolveCurrentUser({})).toThrow(UnauthorizedException);
  });
});
