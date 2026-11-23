import { ConflictException, Injectable } from '@nestjs/common';
import { ArgonService } from '../hasher/argon.service.js';
import type {
  AuthenticatedUser,
  PublicUser,
  StoredUser,
} from './user.entity.js';
import { UserRepository } from './user.repository.js';

@Injectable()
export class UserService {
  constructor(
    private readonly users: UserRepository,
    private readonly argon: ArgonService,
  ) {}

  async createAccount(input: {
    email: string;
    password: string;
  }): Promise<PublicUser> {
    const passwordHash = await this.argon.hash(input.password);
    const user = await this.users.create({
      email: input.email,
      passwordHash,
    });
    if (user === null) {
      throw new ConflictException('Email already registered');
    }
    return {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt.toISOString(),
    };
  }

  findByEmail(email: string): Promise<StoredUser | null> {
    return this.users.findByEmail(email);
  }

  findAuthenticated(id: string): Promise<AuthenticatedUser | null> {
    return this.users.findById(id);
  }
}
