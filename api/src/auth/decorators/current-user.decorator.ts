import {
  createParamDecorator,
  UnauthorizedException,
  type ExecutionContext,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../../user/user.entity.js';

export function resolveCurrentUser(
  request: { user?: AuthenticatedUser },
  key?: keyof AuthenticatedUser,
): AuthenticatedUser | string {
  if (request.user === undefined) {
    throw new UnauthorizedException('Not authenticated');
  }
  return key === undefined ? request.user : request.user[key];
}

export const CurrentUser = createParamDecorator(
  (key: keyof AuthenticatedUser | undefined, context: ExecutionContext) =>
    resolveCurrentUser(
      context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>(),
      key,
    ),
);
