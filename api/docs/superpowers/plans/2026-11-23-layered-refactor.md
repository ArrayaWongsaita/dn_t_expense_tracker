# Layered Refactor + Auth ที่เขียนเอง — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ปรับ `api` ให้เป็นโครง Controller → Service → Repository → Prisma ต่อฟีเจอร์ และถอด `@nestjs/authentication` ออกโดยเขียน auth เองด้วย `@nestjs/jwt` + `argon2` พร้อม unit test ที่อ่านง่าย

**Architecture:** แต่ละฟีเจอร์เป็นโฟลเดอร์ของตัวเองและมีชั้นชัดเจน: `controller` รับ HTTP และ schema, `service` ถือ business rule และแปลงข้อมูล, `repository` เป็นที่เดียวที่แตะ `PrismaService` และแปลง Prisma row เป็น domain type, `entity` เก็บ type ที่ใช้ข้ามชั้น, `dto/` เก็บ Zod schema + type ต่อ input ที่ใช้ร่วมกันอยู่ในไฟล์ `*.schema.ts` ภายใน `dto/` ชั้น auth ประกอบจาก `UserModule` (บัญชีผู้ใช้) + `HasherModule` (argon2) + `JwtModule` และป้องกันทุกเส้นทางด้วย guard ที่ลงทะเบียนผ่าน `APP_GUARD`

**Tech Stack:** NestJS 12 (ESM), Prisma 7 + PostgreSQL 18, Zod 4 ผ่าน `StandardSchemaValidationPipe`, `@nestjs/jwt` 12.0.5, `argon2` 0.45.2, Vitest 4 + Supertest

**Spec:** `docs/superpowers/specs/2026-11-23-layered-refactor-design.md`

## Global Constraints

- ESM: ทุก relative import ลงท้าย `.js`, ไม่มี `__dirname`, รันเทสต์ด้วย Vitest (`vi.fn()` ไม่ใช่ `jest.fn()`)
- Node 26.13.1, pnpm 12, PostgreSQL 18; e2e ต้องมีฐาน `expense_tracker_test` (`.env` ตั้งไว้แล้วในเครื่องนี้)
- pnpm 12 บล็อก build script ของ dependency ใหม่: `pnpm-workspace.yaml` หัวข้อ `allowBuilds` ต้องมี `argon2: true`
- เวอร์ชันที่ล็อก: `@nestjs/jwt` 12.0.5, `argon2` 0.45.2
- e2e สร้างแอปจาก `AppModule` ตรง ๆ: คง `{ provide: APP_PIPE, useClass: StandardSchemaValidationPipe }` ใน `app.module.ts` ห้ามย้ายไป `main.ts`
- HTTP contract ห้ามเปลี่ยน: path, method, status, ฟิลด์, ข้อความ `'Email already registered'` (409) และ `'Invalid email or password'` (401)
- ห้ามเปลี่ยน `prisma/schema.prisma`, migration, และตำแหน่ง generated client (`src/generated/prisma`)
- ห้ามแตะ logic normalize session เป็น UTC ใน `src/prisma/prisma.service.ts`
- คอมเมนต์ในโค้ดและชื่อเทสต์เป็นภาษาอังกฤษ เอกสารเป็นภาษาไทย
- **ห้าม commit หรือ push** (กฎโปรเจกต์) — จบแต่ละ task ให้รันคำสั่งตรวจแล้วรายงานผล
- คำสั่งเดียวสำหรับรันเทสต์ไฟล์เดียว: `pnpm exec vitest run <path>`

## Review Focus

1. Token ที่หมดอายุหรือลายเซ็นผิด — guard ต้องตอบ `401` ไม่ใช่ `500` (verifyAsync โยน error หลายชนิด) → เทสต์ใน Task 4 "rejects an expired or malformed token"
2. `Authorization` ที่ไม่ใช่ `Bearer <token>` (Basic, Bearer ว่าง, Bearer ซ้ำ) — ต้องได้ `401` → เทสต์ใน Task 4 "rejects a scheme that is not Bearer"
3. `PATCH` ด้วย `note: null` — ต้องถึง repository เป็น `null` ไม่ถูกแปลงเป็น undefined จนกลายเป็น "ไม่แก้" → เทสต์ใน Task 5 "keeps an explicit null note when patching"
4. จำนวนเงินจาก Decimal — ต้องตอบกลับสองตำแหน่งเสมอ (`125.5` → `"125.50"`) และจำนวนที่เกิน 10 หลักหน้า point ต้องถูกปฏิเสธ `400` → `expenses.repository.spec.ts` (Task 5) + ตาราง `amount` ใน `dto/expenses.schemas.spec.ts`
5. `limit`/`offset` ที่ซ้ำ, ว่าง, หรือติดลบ — ต้องได้ `400` ไม่ใช่ค่า default เงียบ ๆ → `it.each` ของ `listExpensesSchema` ใน Task 5

หมายเหตุ: ข้อ 4 ทำให้มีเทสต์ที่อยู่นอกตารางในสเปกหนึ่งไฟล์คือ `src/expenses/expenses.repository.spec.ts` (ใช้ fake `PrismaService` ไม่แตะฐานข้อมูล)

---

### Task 1: Hasher module (argon2)

**Files:**
- Modify: `pnpm-workspace.yaml`
- Modify: `package.json` (ผ่าน `pnpm add`)
- Create: `src/hasher/argon.service.ts`
- Create: `src/hasher/hasher.module.ts`
- Test: `src/hasher/argon.service.spec.ts`

**Interfaces:**
- Produces: `ArgonService.hash(plain: string): Promise<string>`, `ArgonService.verify(plain: string, hash: string | undefined): Promise<boolean>`, `HasherModule` (exports `ArgonService`)

- [ ] **Step 1: เพิ่ม `argon2` ใน `allowBuilds`**

`pnpm-workspace.yaml` ต้องกลายเป็น:

```yaml
allowBuilds:
  '@prisma/engines': true
  prisma: true
  argon2: true
```

- [ ] **Step 2: ติดตั้ง dependency**

Run: `pnpm add @nestjs/jwt@12.0.5 argon2@0.45.2`
Expected: `package.json` มีสองตัวใหม่, `pnpm-lock.yaml` เปลี่ยน, `node_modules/argon2` มี prebuilt binary (ไม่มี error เรื่อง build script)

- [ ] **Step 3: เขียนเทสต์ที่ไม่ผ่าน**

`src/hasher/argon.service.spec.ts`:

```ts
import { Test } from '@nestjs/testing';
import { ArgonService } from './argon.service.js';

async function createService(): Promise<ArgonService> {
  const module = await Test.createTestingModule({
    providers: [ArgonService],
  }).compile();
  return module.get(ArgonService);
}

describe('ArgonService', () => {
  const password = 'correct horse battery staple';

  it('stores a password as an argon2id hash, never as plain text', async () => {
    const argon = await createService();

    const hash = await argon.hash(password);

    expect(hash).not.toBe(password);
    expect(hash.startsWith('$argon2id$')).toBe(true);
  });

  it('accepts the password it hashed', async () => {
    const argon = await createService();
    const hash = await argon.hash(password);

    await expect(argon.verify(password, hash)).resolves.toBe(true);
  });

  it('rejects a different password', async () => {
    const argon = await createService();
    const hash = await argon.hash(password);

    await expect(argon.verify('wrong password', hash)).resolves.toBe(false);
  });

  it('rejects when there is no stored hash', async () => {
    const argon = await createService();

    await expect(argon.verify(password, undefined)).resolves.toBe(false);
  });
});
```

- [ ] **Step 4: รันเทสต์ให้เห็นว่าไม่ผ่าน**

Run: `pnpm exec vitest run src/hasher/argon.service.spec.ts`
Expected: FAIL — `Failed to resolve import "./argon.service.js"` (ยังไม่มีไฟล์)

- [ ] **Step 5: เขียน `ArgonService` และ `HasherModule`**

`src/hasher/argon.service.ts` — signature ตาม Interfaces, `hash` เรียก `argon2.hash(plain)`, `verify` คืน `false` ทันทีเมื่อ `hash === undefined` ไม่เรียก argon2

`src/hasher/hasher.module.ts`:

```ts
@Module({ providers: [ArgonService], exports: [ArgonService] })
export class HasherModule {}
```

- [ ] **Step 6: รันเทสต์ให้ผ่าน**

Run: `pnpm exec vitest run src/hasher/argon.service.spec.ts`
Expected: PASS 4 tests

- [ ] **Step 7: ตรวจทั้งโปรเจกต์ยังปกติ**

Run: `pnpm test && pnpm lint && pnpm build`
Expected: unit test เดิม 12 ตัวผ่าน, lint ไม่มีข้อความ, build exit 0 (ยังไม่มีใครใช้ `ArgonService`)

---

### Task 2: Config schema แยกไฟล์และ typed ConfigService

**Files:**
- Create: `src/config/config.schema.ts`
- Test: `src/config/config.schema.spec.ts`
- Modify: `src/app.module.ts` (ลบ schema inline, ใช้ `validationSchema`)
- Modify: `src/prisma/prisma.service.ts` (type ของ constructor)

**Interfaces:**
- Produces: `envSchema` (Zod object), `type Env = z.infer<typeof envSchema>`
- Consumers: `AppModule` (`validationSchema: envSchema`), `PrismaService`, และ `AuthModule` ใน Task 6 (`ConfigService<Env, true>`)

- [ ] **Step 1: เขียนเทสต์ที่ไม่ผ่าน**

`src/config/config.schema.spec.ts`:

```ts
import { envSchema } from './config.schema.js';

const validEnv = {
  DATABASE_URL: 'postgresql://user:pass@127.0.0.1:5432/expense_tracker',
  JWT_SECRET: 'x'.repeat(32),
};

describe('envSchema', () => {
  it('accepts a postgres url and a 32-byte secret', () => {
    expect(envSchema.safeParse(validEnv).success).toBe(true);
  });

  it('rejects a secret shorter than 32 bytes', () => {
    const env = { ...validEnv, JWT_SECRET: 'short' };

    expect(envSchema.safeParse(env).success).toBe(false);
  });

  it('rejects a database url that is not postgres', () => {
    const env = { ...validEnv, DATABASE_URL: 'mysql://user:pass@localhost/db' };

    expect(envSchema.safeParse(env).success).toBe(false);
  });

  it('rejects a missing database url', () => {
    expect(envSchema.safeParse({ JWT_SECRET: validEnv.JWT_SECRET }).success).toBe(false);
  });
});
```

- [ ] **Step 2: รันเทสต์ให้เห็นว่าไม่ผ่าน**

Run: `pnpm exec vitest run src/config/config.schema.spec.ts`
Expected: FAIL — resolve import `./config.schema.js` ไม่ได้

- [ ] **Step 3: เขียน `src/config/config.schema.ts`**

ย้ายกติกาจาก `app.module.ts` มาตรง ๆ: `DATABASE_URL: z.url({ protocol: /^postgres(?:ql)?$/ })`, `JWT_SECRET: z.string().refine((value) => Buffer.byteLength(value, 'utf8') >= 32, { message: 'JWT_SECRET must contain at least 32 bytes' })`, แล้ว `export type Env = z.infer<typeof envSchema>`

- [ ] **Step 4: รันเทสต์ให้ผ่าน**

Run: `pnpm exec vitest run src/config/config.schema.spec.ts`
Expected: PASS 4 tests

- [ ] **Step 5: ใช้ schema ใน `AppModule`**

แทน `ConfigModule.forRoot({ isGlobal: true, validate: ... })` ด้วย `ConfigModule.forRoot({ isGlobal: true, validationSchema: envSchema })`, ลบ `z` และ `environmentSchema` ออกจาก `app.module.ts` คง `APP_PIPE` และ providers/imports เดิมไว้ทั้งหมด

- [ ] **Step 6: ทำ `PrismaService` เป็น typed**

เปลี่ยน constructor เป็น `constructor(config: ConfigService<Env, true>)` และเรียก `config.getOrThrow('DATABASE_URL')` (ไม่ต้องใส่ generic ที่ call) — ห้ามแตะ logic UTC ที่อยู่ถัดลงมา

- [ ] **Step 7: ตรวจว่าแอปยัง boot ด้วย env จริงได้**

Run: `pnpm build && pnpm test:e2e`
Expected: build exit 0, e2e 8 tests ผ่าน (ถ้า `validationSchema` ไม่รับ Zod จะพังตั้งแต่ boot)

---

### Task 3: User module (entity + repository + service)

**Files:**
- Create: `src/user/user.entity.ts`
- Create: `src/user/user.repository.ts`
- Create: `src/user/user.service.ts`
- Create: `src/user/user.module.ts`
- Test: `src/user/user.service.spec.ts`

**Interfaces:**
- Consumes: `PrismaService`, `ArgonService.hash` (Task 1)
- Produces:
  - `StoredUser { id: string; email: string; passwordHash: string; createdAt: Date }`
  - `PublicUser { id: string; email: string; createdAt: string }`
  - `AuthenticatedUser { id: string; email: string }`
  - `UserRepository.findByEmail(email: string): Promise<StoredUser | null>`, `.findById(id: string): Promise<AuthenticatedUser | null>`, `.create(data: { email: string; passwordHash: string }): Promise<StoredUser | null>`
  - `UserService.createAccount(input: { email: string; password: string }): Promise<PublicUser>`, `.findByEmail(email: string): Promise<StoredUser | null>`, `.findAuthenticated(id: string): Promise<AuthenticatedUser | null>`
  - `UserModule` (exports `UserService`)

- [ ] **Step 1: เขียนเทสต์ที่ไม่ผ่าน**

`src/user/user.service.spec.ts` — ของปลอมเขียนมือ ไม่ใช้ automock:

```ts
import { ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ArgonService } from '../hasher/argon.service.js';
import { UserRepository } from './user.repository.js';
import { UserService } from './user.service.js';

const createdAt = new Date('2026-11-22T10:00:00.000Z');
const storedUser = {
  id: 'user-1',
  email: 'ada@example.com',
  passwordHash: 'hashed-password',
  createdAt,
};

function createFakes() {
  const users = {
    findByEmail: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
  };
  const argon = { hash: vi.fn(), verify: vi.fn() };
  return { users, argon };
}

async function createService(fakes: ReturnType<typeof createFakes>) {
  const module = await Test.createTestingModule({ providers: [UserService] })
    .useMocker((token) => {
      if (token === UserRepository) return fakes.users;
      if (token === ArgonService) return fakes.argon;
      return undefined;
    })
    .compile();
  return module.get(UserService);
}

describe('UserService', () => {
  it('hashes the password before writing the account', async () => {
    const fakes = createFakes();
    fakes.argon.hash.mockResolvedValue('hashed-password');
    fakes.users.create.mockResolvedValue(storedUser);
    const service = await createService(fakes);

    await service.createAccount({ email: 'ada@example.com', password: 'plain' });

    expect(fakes.argon.hash).toHaveBeenCalledWith('plain');
    expect(fakes.users.create).toHaveBeenCalledWith({
      email: 'ada@example.com',
      passwordHash: 'hashed-password',
    });
  });

  it('returns the public account shape with an ISO timestamp', async () => {
    const fakes = createFakes();
    fakes.argon.hash.mockResolvedValue('hashed-password');
    fakes.users.create.mockResolvedValue(storedUser);
    const service = await createService(fakes);

    const account = await service.createAccount({
      email: 'ada@example.com',
      password: 'plain',
    });

    expect(account).toEqual({
      id: 'user-1',
      email: 'ada@example.com',
      createdAt: '2026-11-22T10:00:00.000Z',
    });
  });

  it('raises a conflict when the email is already taken', async () => {
    const fakes = createFakes();
    fakes.argon.hash.mockResolvedValue('hashed-password');
    fakes.users.create.mockResolvedValue(null);
    const service = await createService(fakes);

    await expect(
      service.createAccount({ email: 'ada@example.com', password: 'plain' }),
    ).rejects.toThrow(new ConflictException('Email already registered'));
  });

  it('returns null when an authenticated user no longer exists', async () => {
    const fakes = createFakes();
    fakes.users.findById.mockResolvedValue(null);
    const service = await createService(fakes);

    await expect(service.findAuthenticated('deleted-user')).resolves.toBeNull();
  });
});
```

- [ ] **Step 2: รันเทสต์ให้เห็นว่าไม่ผ่าน**

Run: `pnpm exec vitest run src/user/user.service.spec.ts`
Expected: FAIL — resolve import `./user.repository.js` / `./user.service.js` ไม่ได้

- [ ] **Step 3: เขียน entity, repository, service, module**

- `user.entity.ts`: type ทั้งสามตาม Interfaces
- `user.repository.ts`: `@Injectable()`, constructor รับ `PrismaService`; `create` ใช้ `select: { id: true, email: true, passwordHash: true, createdAt: true }` และ catch `Prisma.PrismaClientKnownRequestError` ที่ `code === 'P2002'` คืน `null` (ไม่ throw) — ไม่มี pre-check `findByEmail` ก่อนสร้าง
- `user.service.ts`: `@Injectable()`, constructor รับ `UserRepository` + `ArgonService`; `createAccount` hash ก่อนแล้วค่อยสร้าง, `null` → `ConflictException('Email already registered')`, คืน `{ id, email, createdAt: user.createdAt.toISOString() }`
- `user.module.ts`: `imports: [HasherModule]`, `providers: [UserRepository, UserService]`, `exports: [UserService]`

- [ ] **Step 4: รันเทสต์ให้ผ่าน**

Run: `pnpm exec vitest run src/user/user.service.spec.ts`
Expected: PASS 4 tests

- [ ] **Step 5: ตรวจ lint และ build**

Run: `pnpm lint && pnpm build`
Expected: ไม่มีข้อความจาก oxlint, build exit 0 (`UserModule` ยังไม่ถูก import ที่ไหน)

---

### Task 4: Auth guard + decorators + constants

**Files:**
- Create: `src/auth/auth.constants.ts`
- Create: `src/auth/decorators/public.decorator.ts`
- Create: `src/auth/decorators/current-user.decorator.ts`
- Create: `src/auth/guards/jwt-auth.guard.ts`
- Test: `src/auth/guards/jwt-auth.guard.spec.ts`

**Interfaces:**
- Consumes: `UserService.findAuthenticated` (Task 3)
- Produces:
  - `ACCESS_TOKEN_TTL_SECONDS = 900`, `JWT_ISSUER = 'expense-tracker-api'`, `JWT_AUDIENCE = 'expense-tracker-client'`
  - `IS_PUBLIC_KEY = 'isPublic'`, `Public()` decorator
  - `CurrentUser(key?: keyof AuthenticatedUser)` param decorator
  - `JwtAuthGuard` (`CanActivate`, constructor `(reflector: Reflector, jwt: JwtService, users: UserService)`)

- [ ] **Step 1: เขียนเทสต์ที่ไม่ผ่าน**

`src/auth/guards/jwt-auth.guard.spec.ts`:

```ts
import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { UserService } from '../../user/user.service.js';
import { JWT_AUDIENCE, JWT_ISSUER } from '../auth.constants.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

const user = { id: 'user-1', email: 'ada@example.com' };

function createContext(authorization?: string) {
  const request: { headers: Record<string, string>; user?: typeof user } = {
    headers: authorization === undefined ? {} : { authorization },
  };
  const context = {
    getHandler: () => function handler() {},
    getClass: () => class TestController {},
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { context, request };
}

async function createGuard(options: {
  isPublic?: boolean;
  verify?: () => Promise<unknown>;
  findAuthenticated?: () => Promise<typeof user | null>;
}) {
  const reflector = {
    getAllAndOverride: vi.fn().mockReturnValue(options.isPublic ?? false),
  } as unknown as Reflector;
  const jwt = { verifyAsync: vi.fn(options.verify ?? (() => Promise.resolve({ sub: user.id }))) };
  const users = {
    findAuthenticated: vi.fn(options.findAuthenticated ?? (() => Promise.resolve(user))),
  };
  const module = await Test.createTestingModule({ providers: [JwtAuthGuard] })
    .useMocker((token) => {
      if (token === Reflector) return reflector;
      if (token === JwtService) return jwt;
      if (token === UserService) return users;
      return undefined;
    })
    .compile();
  return { guard: module.get(JwtAuthGuard), jwt, users };
}

describe('JwtAuthGuard', () => {
  it('lets public routes through without reading a token', async () => {
    const { guard, jwt } = await createGuard({ isPublic: true });
    const { context } = createContext(undefined);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(jwt.verifyAsync).not.toHaveBeenCalled();
  });

  it('rejects a request without an authorization header', async () => {
    const { guard } = await createGuard({});
    const { context } = createContext(undefined);

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a scheme that is not Bearer', async () => {
    const { guard } = await createGuard({});
    const { context } = createContext('Basic dXNlcjpwYXNz');

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('rejects an expired or malformed token', async () => {
    const { guard } = await createGuard({
      verify: () => Promise.reject(new Error('jwt expired')),
    });
    const { context } = createContext('Bearer expired-token');

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a valid token whose user no longer exists', async () => {
    const { guard } = await createGuard({
      findAuthenticated: () => Promise.resolve(null),
    });
    const { context } = createContext('Bearer valid-token');

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('attaches the user and verifies with the app issuer and audience', async () => {
    const { guard, jwt } = await createGuard({});
    const { context, request } = createContext('Bearer valid-token');

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(jwt.verifyAsync).toHaveBeenCalledWith('valid-token', {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    expect(request.user).toEqual(user);
  });
});
```

- [ ] **Step 2: รันเทสต์ให้เห็นว่าไม่ผ่าน**

Run: `pnpm exec vitest run src/auth/guards/jwt-auth.guard.spec.ts`
Expected: FAIL — resolve import `../auth.constants.js` ไม่ได้

- [ ] **Step 3: เขียน constants, decorators, guard**

- `auth.constants.ts`: สามค่าตาม Interfaces
- `public.decorator.ts`: `export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);`
- `current-user.decorator.ts`: `createParamDecorator((key: keyof AuthenticatedUser | undefined, context: ExecutionContext) => { const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>(); return key === undefined ? request.user : request.user?.[key]; })`
- `jwt-auth.guard.ts`: ตาม Interfaces และลำดับ: อ่าน `IS_PUBLIC_KEY` ด้วย `reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()])` → ถ้า public คืน `true`; แยก token ด้วย helper ที่รับเฉพาะ `Bearer ` แล้ว trim (ว่าง → null); `verifyAsync(token, { issuer: JWT_ISSUER, audience: JWT_AUDIENCE })` ใน `try/catch` — catch ทุก error แล้ว `throw new UnauthorizedException()`; `claims.sub` ว่างหรือ `findAuthenticated` คืน `null` → `UnauthorizedException`; สำเร็จให้ตั้ง `request.user` แล้วคืน `true`

- [ ] **Step 4: รันเทสต์ให้ผ่าน**

Run: `pnpm exec vitest run src/auth/guards/jwt-auth.guard.spec.ts`
Expected: PASS 6 tests

- [ ] **Step 5: ตรวจ lint และ build**

Run: `pnpm lint && pnpm build`
Expected: ไม่มีข้อความ, build exit 0 (guard ยังไม่ถูกใช้)

---

### Task 5: Expenses แยกชั้น repository + dto

**Files:**
- Create: `src/expenses/expense.entity.ts`
- Create: `src/expenses/dto/expense-fields.schema.ts`
- Create: `src/expenses/dto/create-expense.dto.ts`
- Create: `src/expenses/dto/update-expense.dto.ts`
- Create: `src/expenses/dto/list-expenses.dto.ts`
- Create: `src/expenses/dto/expense-id.dto.ts`
- Create: `src/expenses/expenses.repository.ts`
- Modify: `src/expenses/expenses.service.ts` (เขียนใหม่ทั้งไฟล์)
- Modify: `src/expenses/expenses.controller.ts` (import จาก `dto/`, ใช้ `CurrentUser` ของเรา)
- Modify: `src/expenses/expenses.module.ts` (เพิ่ม `ExpensesRepository`)
- Delete: `src/expenses/expenses.schemas.ts`
- Move + extend: `src/expenses/expenses.schemas.spec.ts` → `src/expenses/dto/expenses.schemas.spec.ts`
- Test: `src/expenses/expenses.service.spec.ts`
- Test: `src/expenses/expenses.repository.spec.ts`

**Interfaces:**
- Consumes: `PrismaService`, `CurrentUser` (Task 4)
- Produces:
  - `ExpenseRecord { id: string; title: string; amount: string; spentOn: Date; note: string | null; createdAt: Date; updatedAt: Date }`
  - `ExpenseResponse { id: string; title: string; amount: string; spentOn: string; note: string | null; createdAt: string; updatedAt: string }`
  - `ExpensesRepository.findPage(userId: string, page: { limit: number; offset: number }): Promise<ExpenseRecord[]>`, `.create(userId: string, data: { title: string; amount: string; spentOn: Date; note: string | null }): Promise<ExpenseRecord>`, `.findOne(userId: string, id: string): Promise<ExpenseRecord | null>`, `.update(userId: string, id: string, changes: { title?: string; amount?: string; spentOn?: Date; note?: string | null }): Promise<ExpenseRecord | null>`, `.remove(userId: string, id: string): Promise<boolean>`
  - `ExpensesService.list(userId: string, query: ListExpensesDto): Promise<ExpenseResponse[]>`, `.create(userId: string, input: CreateExpenseDto): Promise<ExpenseResponse>`, `.get(userId: string, id: string): Promise<ExpenseResponse>`, `.update(userId: string, id: string, input: UpdateExpenseDto): Promise<ExpenseResponse>`, `.remove(userId: string, id: string): Promise<void>`
  - `CreateExpenseDto`, `UpdateExpenseDto`, `ListExpensesDto` และ `createExpenseSchema`, `updateExpenseSchema`, `listExpensesSchema`, `expenseIdSchema`

- [ ] **Step 1: เขียนเทสต์ service ที่ไม่ผ่าน**

`src/expenses/expenses.service.spec.ts` — ของปลอมเป็น `ExpensesRepository` ตัวเดียว:

```ts
import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ExpensesRepository } from './expenses.repository.js';
import { ExpensesService } from './expenses.service.js';

const record = {
  id: 'expense-1',
  title: 'Lunch',
  amount: '125.50',
  spentOn: new Date('2026-11-22T00:00:00.000Z'),
  note: 'receipt',
  createdAt: new Date('2026-11-22T10:00:00.000Z'),
  updatedAt: new Date('2026-11-22T10:00:00.000Z'),
};

const response = {
  id: 'expense-1',
  title: 'Lunch',
  amount: '125.50',
  spentOn: '2026-11-22',
  note: 'receipt',
  createdAt: '2026-11-22T10:00:00.000Z',
  updatedAt: '2026-11-22T10:00:00.000Z',
};

function createFakes() {
  return {
    findPage: vi.fn(),
    create: vi.fn(),
    findOne: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  };
}

async function createService(fakes: ReturnType<typeof createFakes>) {
  const module = await Test.createTestingModule({ providers: [ExpensesService] })
    .useMocker((token) => (token === ExpensesRepository ? fakes : undefined))
    .compile();
  return module.get(ExpensesService);
}

describe('ExpensesService', () => {
  it('maps stored records to the wire shape', async () => {
    const fakes = createFakes();
    fakes.findPage.mockResolvedValue([record]);
    const service = await createService(fakes);

    await expect(service.list('user-1', { limit: 20, offset: 0 })).resolves.toEqual([
      response,
    ]);
  });

  it('sends spentOn to the repository as UTC midnight', async () => {
    const fakes = createFakes();
    fakes.create.mockResolvedValue(record);
    const service = await createService(fakes);

    await service.create('user-1', {
      title: 'Lunch',
      amount: '125.50',
      spentOn: '2026-11-22',
      note: 'receipt',
    });

    expect(fakes.create).toHaveBeenCalledWith('user-1', {
      title: 'Lunch',
      amount: '125.50',
      spentOn: new Date('2026-11-22T00:00:00.000Z'),
      note: 'receipt',
    });
  });

  it('keeps an explicit null note when patching', async () => {
    const fakes = createFakes();
    fakes.update.mockResolvedValue({ ...record, note: null });
    const service = await createService(fakes);

    await service.update('user-1', 'expense-1', { note: null });

    expect(fakes.update).toHaveBeenCalledWith('user-1', 'expense-1', { note: null });
  });

  it('raises not found when the expense does not exist', async () => {
    const fakes = createFakes();
    fakes.findOne.mockResolvedValue(null);
    const service = await createService(fakes);

    await expect(service.get('user-1', 'missing')).rejects.toThrow(
      new NotFoundException('Expense not found'),
    );
  });

  it('raises not found when a patch matches no row', async () => {
    const fakes = createFakes();
    fakes.update.mockResolvedValue(null);
    const service = await createService(fakes);

    await expect(
      service.update('user-1', 'missing', { title: 'Changed' }),
    ).rejects.toThrow(new NotFoundException('Expense not found'));
  });

  it('raises not found when a delete matches no row', async () => {
    const fakes = createFakes();
    fakes.remove.mockResolvedValue(false);
    const service = await createService(fakes);

    await expect(service.remove('user-1', 'missing')).rejects.toThrow(
      new NotFoundException('Expense not found'),
    );
  });
});
```

- [ ] **Step 2: รันเทสต์ให้เห็นว่าไม่ผ่าน**

Run: `pnpm exec vitest run src/expenses/expenses.service.spec.ts`
Expected: FAIL — `ExpensesRepository` ยังไม่มี / `ExpensesService` ยังรับ `PrismaService`

- [ ] **Step 3: เขียนเทสต์ repository ที่ไม่ผ่าน**

`src/expenses/expenses.repository.spec.ts` — pin การแปลง Prisma row เป็น `ExpenseRecord` (จำนวนเงินสองตำแหน่ง) ด้วย fake `PrismaService` ไม่แตะฐานข้อมูล:

```ts
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ExpensesRepository } from './expenses.repository.js';

const row = {
  id: 'expense-1',
  userId: 'user-1',
  title: 'Lunch',
  amount: new Prisma.Decimal('125.5'),
  spentOn: new Date('2026-11-22T00:00:00.000Z'),
  note: null,
  createdAt: new Date('2026-11-22T10:00:00.000Z'),
  updatedAt: new Date('2026-11-22T10:00:00.000Z'),
};

function createRepository() {
  const prisma = { expense: { findMany: vi.fn().mockResolvedValue([row]) } };
  return {
    repository: new ExpensesRepository(prisma as unknown as PrismaService),
    prisma,
  };
}

describe('ExpensesRepository', () => {
  it('returns amounts with two decimals', async () => {
    const { repository } = createRepository();

    const [expense] = await repository.findPage('user-1', { limit: 20, offset: 0 });

    expect(expense.amount).toBe('125.50');
  });

  it('lists only the given account, newest date first', async () => {
    const { repository, prisma } = createRepository();

    await repository.findPage('user-1', { limit: 5, offset: 10 });

    expect(prisma.expense.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      orderBy: [{ spentOn: 'desc' }, { id: 'desc' }],
      take: 5,
      skip: 10,
    });
  });
});
```

- [ ] **Step 4: รันเทสต์ให้เห็นว่าไม่ผ่าน**

Run: `pnpm exec vitest run src/expenses/expenses.repository.spec.ts`
Expected: FAIL — `./expenses.repository.js` ไม่มี

- [ ] **Step 5: แยก schema เป็น `dto/`**

- `dto/expense-fields.schema.ts`: ย้าย `expenseFields` (title, amount, spentOn, note) จาก `expenses.schemas.ts` มาทั้งก้อน กติกาตัวอักษรและ regex ห้ามแก้
- `dto/create-expense.dto.ts`: `createExpenseSchema = z.strictObject({ ...expenseFields, note: expenseFields.note.default(null) })` + `export type CreateExpenseDto = z.infer<typeof createExpenseSchema>`
- `dto/update-expense.dto.ts`: `updateExpenseSchema` เดิม (`.partial().refine(keys.length > 0, 'Provide at least one field')`) + `UpdateExpenseDto`
- `dto/list-expenses.dto.ts`: `unsignedInteger` + `listExpensesSchema` (limit 1–100 default 20, offset 0–2147483647 default 0) + `ListExpensesDto`
- `dto/expense-id.dto.ts`: `export const expenseIdSchema = z.uuid();`
- ลบ `src/expenses/expenses.schemas.ts` หลังย้ายครบ

- [ ] **Step 6: ย้ายและเพิ่มเทสต์ schema**

ย้าย `expenses.schemas.spec.ts` ไป `src/expenses/dto/expenses.schemas.spec.ts` โดยเปลี่ยน import เป็น `./create-expense.dto.js` และ `./list-expenses.dto.js`, คงตารางเดิมทั้งหมด แล้วเพิ่ม:

```ts
it.each([
  [{ limit: '5', offset: '0' }, true],
  [{}, true],
  [{ limit: ['1', '2'] }, false],
  [{ offset: '' }, false],
  [{ limit: '101' }, false],
  [{ offset: '-1' }, false],
])('validates list query %j', (query, valid) => {
  expect(listExpensesSchema.safeParse(query).success).toBe(valid);
});
```

- [ ] **Step 7: เขียน `expenses.repository.ts` และ `expense.entity.ts`**

- `expense.entity.ts`: `ExpenseRecord` + `ExpenseResponse` ตาม Interfaces
- `expenses.repository.ts`: `@Injectable()`, constructor รับ `PrismaService`; mapper `toExpenseRecord(expense): ExpenseRecord` ที่ทำ `amount: expense.amount.toFixed(2)` และคืน `spentOn` เป็น `Date`; `findPage` ใช้ `where: { userId }`, `orderBy: [{ spentOn: 'desc' }, { id: 'desc' }]`, `take: limit`, `skip: offset`; `create` ใช้ `data: { ...input, userId }`; `findOne` ใช้ `where: { id, userId }`; `update` catch `Prisma.PrismaClientKnownRequestError` code `P2025` คืน `null`; `remove` catch `P2025` คืน `false`

- [ ] **Step 8: เขียน `expenses.service.ts` ใหม่**

constructor รับ `ExpensesRepository` เท่านั้น; `toUtcDate(value: string): Date` เป็น function ระดับโมดูลที่คืน `new Date(\`${value}T00:00:00.000Z\`)`; `list` map record → response; `create` แปลง `spentOn` ก่อนเรียก repository; `get`/`update`/`remove` แปลง `null`/`false` เป็น `NotFoundException('Expense not found')`; `toExpenseResponse` คืน `spentOn: record.spentOn.toISOString().slice(0, 10)` และ ISO string ของ `createdAt`/`updatedAt`

- [ ] **Step 9: แก้ controller และ module**

`expenses.controller.ts`: import type จาก `./dto/*.dto.js`, เปลี่ยนชื่อ type เป็น `CreateExpenseDto` / `UpdateExpenseDto` / `ListExpensesDto`, เปลี่ยน `@CurrentUser` เป็น import จาก `../auth/decorators/current-user.decorator.js` (ลบ import จาก `@nestjs/authentication`) — route, status, และ schema ที่ผูกกับ `@Param`/`@Query`/`@Body` ห้ามเปลี่ยน
`expenses.module.ts`: เพิ่ม `ExpensesRepository` ใน providers

- [ ] **Step 10: รันเทสต์หน่วยทั้งหมด**

Run: `pnpm test`
Expected: PASS ทุกไฟล์ที่ Task 1–5 สร้างหรือแก้ (hasher, config, user, guard, expenses service, expenses repository, expenses schemas)

- [ ] **Step 11: ตรวจว่า HTTP contract ยังเดิม**

Run: `pnpm lint && pnpm test:e2e`
Expected: lint ไม่มีข้อความ, e2e 8 tests ผ่าน (ยังใช้ auth ของ package และ hash `$scrypt$`)

---

### Task 6: สลับ auth มาใช้ guard/JWT ของเรา

**Files:**
- Rewrite: `src/auth/auth.types.ts`
- Create: `src/auth/dto/email.schema.ts`
- Create: `src/auth/dto/signup.dto.ts`
- Create: `src/auth/dto/login.dto.ts`
- Rewrite: `src/auth/auth.service.ts`
- Rewrite: `src/auth/auth.controller.ts`
- Rewrite: `src/auth/auth.module.ts`
- Delete: `src/auth/auth.schemas.ts`, `src/auth/jwt-auth.provider.ts`
- Modify: `test/app.e2e-spec.ts` (assertion ของ hash)
- Test: `src/auth/auth.service.spec.ts`

**Interfaces:**
- Consumes: `UserService` (Task 3), `ArgonService` (Task 1), `JwtAuthGuard` + `Public` (Task 4), `ACCESS_TOKEN_TTL_SECONDS`/`JWT_ISSUER`/`JWT_AUDIENCE` (Task 4), `Env` (Task 2)
- Produces: `AccessTokenResponse { accessToken: string; expiresIn: number }`, `AuthenticatedRequest` (`Request` ที่มี `user: AuthenticatedUser`), `AuthService.signup(input: SignUpDto): Promise<PublicUser>`, `AuthService.login(input: LoginDto): Promise<AccessTokenResponse>`

- [ ] **Step 1: เขียนเทสต์ที่ไม่ผ่าน**

`src/auth/auth.service.spec.ts`:

```ts
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { ArgonService } from '../hasher/argon.service.js';
import { UserService } from '../user/user.service.js';
import { ACCESS_TOKEN_TTL_SECONDS } from './auth.constants.js';
import { AuthService } from './auth.service.js';

const storedUser = {
  id: 'user-1',
  email: 'ada@example.com',
  passwordHash: 'hashed-password',
  createdAt: new Date('2026-11-22T10:00:00.000Z'),
};

function createFakes() {
  return {
    users: { createAccount: vi.fn(), findByEmail: vi.fn(), findAuthenticated: vi.fn() },
    argon: { hash: vi.fn(), verify: vi.fn() },
    jwt: { signAsync: vi.fn() },
  };
}

async function createService(fakes: ReturnType<typeof createFakes>) {
  const module = await Test.createTestingModule({ providers: [AuthService] })
    .useMocker((token) => {
      if (token === UserService) return fakes.users;
      if (token === ArgonService) return fakes.argon;
      if (token === JwtService) return fakes.jwt;
      return undefined;
    })
    .compile();
  return module.get(AuthService);
}

describe('AuthService', () => {
  it('returns the account created by the user service', async () => {
    const fakes = createFakes();
    const account = { id: 'user-1', email: 'ada@example.com', createdAt: '2026-11-22T10:00:00.000Z' };
    fakes.users.createAccount.mockResolvedValue(account);
    const service = await createService(fakes);

    await expect(
      service.signup({ email: 'ada@example.com', password: 'correct horse battery' }),
    ).resolves.toEqual(account);
  });

  it('issues a token for the signed-in account', async () => {
    const fakes = createFakes();
    fakes.users.findByEmail.mockResolvedValue(storedUser);
    fakes.argon.verify.mockResolvedValue(true);
    fakes.jwt.signAsync.mockResolvedValue('signed-token');
    const service = await createService(fakes);

    await expect(
      service.login({ email: 'ada@example.com', password: 'plain' }),
    ).resolves.toEqual({ accessToken: 'signed-token', expiresIn: ACCESS_TOKEN_TTL_SECONDS });

    expect(fakes.jwt.signAsync).toHaveBeenCalledWith({
      sub: 'user-1',
      email: 'ada@example.com',
    });
  });

  it('answers the same for an unknown email and a wrong password', async () => {
    const unknownEmail = createFakes();
    unknownEmail.users.findByEmail.mockResolvedValue(null);
    const wrongPassword = createFakes();
    wrongPassword.users.findByEmail.mockResolvedValue(storedUser);
    wrongPassword.argon.verify.mockResolvedValue(false);

    const expected = new UnauthorizedException('Invalid email or password');
    await expect(
      (await createService(unknownEmail)).login({
        email: 'nobody@example.com',
        password: 'plain',
      }),
    ).rejects.toThrow(expected);
    await expect(
      (await createService(wrongPassword)).login({
        email: 'ada@example.com',
        password: 'plain',
      }),
    ).rejects.toThrow(expected);
  });
});
```

- [ ] **Step 2: รันเทสต์ให้เห็นว่าไม่ผ่าน**

Run: `pnpm exec vitest run src/auth/auth.service.spec.ts`
Expected: FAIL — `auth.service.ts` ยังรับ `PrismaService`/`PasswordHasher`/`TokenService` ไม่ตรงกับของปลอม

- [ ] **Step 3: เขียน `auth.types.ts` และ `dto/`**

- `auth.types.ts`: `AccessTokenResponse`, `AuthenticatedRequest` (`Request` จาก `express` + `user: AuthenticatedUser` นำเข้าจาก `../user/user.entity.js`) — **ลบ `declare module '@nestjs/authentication'` ทั้งก้อน**
- `dto/email.schema.ts`: `export const emailSchema = z.string().trim().toLowerCase().pipe(z.email().max(254));`
- `dto/signup.dto.ts`: `signupSchema = z.strictObject({ email: emailSchema, password: z.string().min(12).max(128) })` + `type SignUpDto`
- `dto/login.dto.ts`: `loginSchema = z.strictObject({ email: emailSchema, password: z.string().min(1).max(128) })` + `type LoginDto`

- [ ] **Step 4: เขียน `auth.service.ts`**

constructor รับ `(users: UserService, argon: ArgonService, jwt: JwtService)`; `signup` คืน `this.users.createAccount(input)`; `login` หา `findByEmail`, ถ้ามีผู้ใช้ให้ `argon.verify(password, user.passwordHash)` แล้วถ้าไม่มีผู้ใช้หรือรหัสไม่ตรงโยน `UnauthorizedException('Invalid email or password')`; สำเร็จให้ `jwt.signAsync({ sub: user.id, email: user.email })` แล้วคืน `{ accessToken, expiresIn: ACCESS_TOKEN_TTL_SECONDS }`

- [ ] **Step 5: เขียน controller และ module**

`auth.controller.ts`: `@Public()` ที่ class, `@Controller('auth')`, `@Post('signup') signup(@Body({ schema: signupSchema }) input: SignUpDto)`, `@HttpCode(HttpStatus.OK) @Post('login') login(@Body({ schema: loginSchema }) input: LoginDto)`
`auth.module.ts`:

```ts
imports: [
  UserModule,
  HasherModule,
  JwtModule.registerAsync({
    inject: [ConfigService],
    useFactory: (config: ConfigService<Env, true>) => ({
      secret: config.getOrThrow('JWT_SECRET'),
      signOptions: {
        expiresIn: ACCESS_TOKEN_TTL_SECONDS,
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
      },
      verifyOptions: { issuer: JWT_ISSUER, audience: JWT_AUDIENCE },
    }),
  }),
],
controllers: [AuthController],
providers: [AuthService, { provide: APP_GUARD, useClass: JwtAuthGuard }],
```

ลบ `AuthenticationModule.forRootAsync` และ `JwtAuthProvider` ออกทั้งหมด

- [ ] **Step 6: รันเทสต์ให้ผ่าน**

Run: `pnpm exec vitest run src/auth/auth.service.spec.ts`
Expected: PASS 3 tests

- [ ] **Step 7: แก้ assertion ของ hash ใน e2e**

`test/app.e2e-spec.ts`: `expect(stored.passwordHash).toMatch(/^\$scrypt\$/)` → `expect(stored.passwordHash).toMatch(/^\$argon2id\$/)` (แก้บรรทัดเดียว ไม่แตะเทสต์อื่น)

- [ ] **Step 8: ตรวจว่าพฤติกรรม HTTP ยังเหมือนเดิม**

Run: `pnpm lint && pnpm test && pnpm test:e2e`
Expected: unit test ทุกไฟล์ผ่าน, e2e 8 tests ผ่าน (401/409/400 เดิมทั้งหมด)

---

### Task 7: ถอด `@nestjs/authentication` ออกจากโปรเจกต์

**Files:**
- Modify: `package.json` (ผ่าน `pnpm remove`)
- Delete: `src/app.controller.ts`, `src/app.service.ts`
- Modify: `src/app.module.ts` (ลบ controller/provider ที่อ้างถึง)

**Interfaces:**
- Produces: `AppModule` ที่ imports `ConfigModule`, `PrismaModule` (global), `AuthModule`, `ExpensesModule` และ provider `APP_PIPE` เท่านั้น

- [ ] **Step 1: ยืนยันว่าไม่มีใครใช้ package แล้ว**

Run: `grep -rn "@nestjs/authentication" src test --include=*.ts`
Expected: เจอเฉพาะ `src/app.controller.ts`

- [ ] **Step 2: ลบ controller/service ของ starter**

ลบ `src/app.controller.ts` และ `src/app.service.ts` แล้วแก้ `app.module.ts`: เอา `AppController`/`AppService` ออกจาก `controllers`/`providers` (ลบ key `controllers` ทั้งอันถ้าว่าง) คง `{ provide: APP_PIPE, useClass: StandardSchemaValidationPipe }`

- [ ] **Step 3: ถอด dependency**

Run: `pnpm remove @nestjs/authentication`
Expected: `package.json` ไม่มีบรรทัดนั้น, lockfile เปลี่ยน, `git status` ไม่มีไฟล์ค้างที่ import package

- [ ] **Step 4: ตรวจว่าไม่มีอะไรอ้างถึงแล้ว**

Run: `grep -rn "@nestjs/authentication" src test package.json`
Expected: ไม่มีผลลัพธ์ (exit 1 จาก grep ถือว่าผ่าน)

- [ ] **Step 5: ทำให้ `PrismaModule` เป็น global**

`src/prisma/prisma.module.ts`: เพิ่ม `@Global()` เหนือ `@Module` (import `Global` จาก `@nestjs/common`)
`src/expenses/expenses.module.ts`: ลบ `PrismaModule` ออกจาก `imports` (เหลือแค่ controllers/providers) — `AuthModule` ไม่ได้ import `PrismaModule` ตั้งแต่ Task 6 แล้ว

- [ ] **Step 6: ตรวจทั้งชุด**

Run: `pnpm lint && pnpm test && pnpm test:e2e && pnpm build`
Expected: ผ่านทั้งหมด, e2e 8 tests ผ่านโดยไม่มี package เดิม

---

### Task 8: อัปเดตเอกสาร

**Files:**
- Modify: `docs/superpowers/specs/2026-11-22-expense-tracker-api-design.md` (หมายเหตุ "ถูกแทนที่")
- Modify: `docs/superpowers/plans/2026-11-22-expense-tracker-api.md` (หมายเหตุเดียวกัน)
- Modify: `README.md` (หัวข้อทดสอบ + หมายเหตุเรื่องรหัสผ่านเดิม)

**Interfaces:** ไม่มี (เอกสารเท่านั้น)

- [ ] **Step 1: ใส่หมายเหตุที่สเปกและแผนชุด 2026-11-22**

ใต้หัวเรื่องของทั้งสองไฟล์ เพิ่มบรรทัดเดียว:

```markdown
> **ถูกแทนที่แล้ว:** โครง auth และ layer ปัจจุบันดู `docs/superpowers/specs/2026-11-23-layered-refactor-design.md`
```

ไม่ต้องแก้เนื้อหาเดิมที่เหลือ (เป็นประวัติการตัดสินใจ)

- [ ] **Step 2: แก้หัวข้อ "ทดสอบ" ของ README**

ให้ระบุว่า `pnpm test` รัน unit test ของ `ArgonService`, `envSchema`, `UserService`, `JwtAuthGuard`, `ExpensesService`, `ExpensesRepository` และตารางค่าขอบของ schema ส่วน `pnpm test:e2e` คงคำอธิบายเดิม และเพิ่มบรรทัด:

```markdown
รหัสผ่านในฐานข้อมูลเก็บเป็น argon2id (`$argon2id$...`) บัญชีที่สร้างไว้ก่อนรุ่นนี้จะล็อกอินไม่ได้ ต้องสมัครใหม่
```

- [ ] **Step 3: จัดรูปแบบโค้ดทั้งหมด**

Run: `pnpm format`
Expected: prettier เขียนไฟล์ `src/**/*.ts` และ `test/**/*.ts` โดยไม่มี error

- [ ] **Step 4: ตรวจรอบสุดท้ายทั้งหมด**

Run: `pnpm lint && pnpm test && pnpm test:e2e && pnpm build`
Expected: ผ่านทั้งหมด — unit test ครบทุกไฟล์, e2e 8 tests, build exit 0

- [ ] **Step 5: รายงานผลต่างของไฟล์**

Run: `git status --short && git diff --stat`
Expected: เห็นเฉพาะไฟล์ที่แผนนี้ระบุ (ไม่มี `src/generated`, ไม่มี `.env`, ไม่มี `dist`) — รายงานให้ผู้ใช้ ไม่ commit
