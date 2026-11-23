import {
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../../user/user.service.js';
import { JWT_AUDIENCE, JWT_ISSUER } from '../auth.constants.js';
import type { AuthenticatedRequest } from '../auth.types.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';

const BEARER_TOKEN = /^bearer\s+(\S+)$/i;

function bearerToken(header: string | undefined): string | null {
  if (header === undefined) {
    return null;
  }
  const match = BEARER_TOKEN.exec(header.trim());
  return match === null ? null : match[1];
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly users: UserService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic === true) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = bearerToken(request.headers.authorization);
    if (token === null) {
      throw new UnauthorizedException();
    }

    let subject: string;
    try {
      const claims = await this.jwt.verifyAsync<{ sub?: unknown }>(token, {
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
      });
      if (typeof claims.sub !== 'string' || claims.sub.length === 0) {
        throw new UnauthorizedException();
      }
      subject = claims.sub;
    } catch {
      throw new UnauthorizedException();
    }

    const user = await this.users.findAuthenticated(subject);
    if (user === null) {
      throw new UnauthorizedException();
    }

    request.user = user;
    return true;
  }
}
