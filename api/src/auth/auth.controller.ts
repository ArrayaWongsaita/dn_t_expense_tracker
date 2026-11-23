import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { Public } from './decorators/public.decorator.js';
import { loginSchema } from './dto/login.dto.js';
import type { LoginDto } from './dto/login.dto.js';
import { signupSchema } from './dto/signup.dto.js';
import type { SignUpDto } from './dto/signup.dto.js';

@Public()
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('signup')
  signup(@Body({ schema: signupSchema }) input: SignUpDto) {
    return this.auth.signup(input);
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body({ schema: loginSchema }) input: LoginDto) {
    return this.auth.login(input);
  }
}
