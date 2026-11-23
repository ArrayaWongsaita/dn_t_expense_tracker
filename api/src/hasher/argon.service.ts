import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

@Injectable()
export class ArgonService {
  hash(plain: string): Promise<string> {
    return argon2.hash(plain);
  }

  async verify(plain: string, hash: string | undefined): Promise<boolean> {
    if (hash === undefined) {
      return false;
    }
    try {
      return await argon2.verify(hash, plain);
    } catch {
      return false;
    }
  }
}
