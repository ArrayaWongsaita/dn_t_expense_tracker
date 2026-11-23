import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ArgonService } from '../hasher/argon.service.js';
import type { PublicUser } from '../user/user.entity.js';
import { UserService } from '../user/user.service.js';
import { ACCESS_TOKEN_TTL_SECONDS } from './auth.constants.js';
import type { AccessTokenResponse } from './auth.types.js';
import type { LoginDto } from './dto/login.dto.js';
import type { SignUpDto } from './dto/signup.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UserService,
    private readonly argon: ArgonService,
    private readonly jwt: JwtService,
  ) {}

  signup(input: SignUpDto): Promise<PublicUser> {
    return this.users.createAccount(input);
  }

  async login({ email, password }: LoginDto): Promise<AccessTokenResponse> {
    const user = await this.users.findByEmail(email);
    const valid =
      user === null
        ? false
        : await this.argon.verify(password, user.passwordHash);
    if (user === null || !valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
    });
    return { accessToken, expiresIn: ACCESS_TOKEN_TTL_SECONDS };
  }
}
