import {
  Injectable,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import type { Env } from '../config/config.schema.js';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(config: ConfigService<Env, true>) {
    const databaseUrl = new URL(config.getOrThrow('DATABASE_URL'));
    const options =
      databaseUrl.searchParams.get('options') || process.env.PGOPTIONS || '';
    // Prisma's PostgreSQL adapter interprets returned timestamptz values as UTC.
    databaseUrl.searchParams.set(
      'options',
      `${options} -c timezone=UTC`.trim(),
    );

    super({
      adapter: new PrismaPg({
        connectionString: databaseUrl.toString(),
      }),
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
