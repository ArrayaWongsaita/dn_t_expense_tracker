import type { Request } from 'express';
import type { AuthenticatedUser } from '../user/user.entity.js';

export interface AccessTokenResponse {
  accessToken: string;
  expiresIn: number;
}

export type AuthenticatedRequest = Request & { user?: AuthenticatedUser };
