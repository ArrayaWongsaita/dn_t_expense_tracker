# Layered refactor พร้อม auth ที่เขียนเอง

## ที่มาและเป้าหมาย

โปรเจกต์ `api` ถูกสร้างจาก design เดิมที่เลือกใช้ `@nestjs/authentication` เป็นก้อนสำเร็จรูป ทำให้ชั้น auth เกือบทั้งหมดอยู่ใน library: hash รหัสผ่าน ออก token ตรวจ token และดึงผู้ใช้จากคำขอ ผู้ใช้ต้องการ

1. ปรับโครงไฟล์และชั้นการทำงานให้เหมือน repo ตัวอย่าง [dnc03-nestjs-db-config](https://github.com/earth824/dnc03-nestjs-db-config/tree/main/src) — แยกโฟลเดอร์ตามฟีเจอร์ แต่ละฟีเจอร์มี controller, service, repository, entity และ `dto/` แยกไฟล์ต่อ input
2. ถอด `@nestjs/authentication` ออก แล้วเขียน auth เอง เพื่อให้เห็นกลไกภายใน (hash, sign, verify, guard, decorator)
3. มี unit test ที่เขียนด้วย `Test.createTestingModule` และอ่านเข้าใจได้ง่าย ใช้เป็นแม่แบบสำหรับฝึกเขียนเทสต์เอง

`packages` ที่ยังคงเดิมตามเหตุผลของโปรเจกต์: NestJS 12, Prisma 7 + PostgreSQL, Zod ผ่าน `StandardSchemaValidationPipe`, Vitest + Supertest

## ขอบเขต

**ทำ**

- โครง layer ต่อฟีเจอร์: Controller → Service → Repository → Prisma
- `dto/` แยกไฟล์ต่อ input, entity/response type แยกจาก service
- auth ของเราเอง: `@nestjs/jwt` + `argon2` + guard + decorators แทน `@nestjs/authentication`
- `src/config/config.schema.ts` เก็บ `envSchema` + `Env`, ใช้ `ConfigModule.forRoot({ validationSchema })` และ `ConfigService<Env, true>`
- `PrismaModule` เป็น `@Global()`
- ลบ `src/app.controller.ts` และ `src/app.service.ts` (Hello World ที่ไม่มีผู้เรียก)
- unit test ด้วย `Test.createTestingModule` ครอบ service และ guard, e2e เดิมยังผ่าน
- อัปเดตเอกสาร: เพิ่มหมายเหตุ "ถูกแทนที่โดยเอกสารนี้" ที่สเปก `2026-11-22-expense-tracker-api-design.md` (ไม่เขียนทับประวัติที่อนุมัติไปแล้ว), ใส่หมายเหตุเดียวกันที่หัวไฟล์แผน `2026-11-22-expense-tracker-api.md`, และแก้หัวข้อ "ทดสอบ" ของ README ที่บอกว่า `pnpm test` ตรวจแค่จำนวนเงินกับวันที่ ให้บอกว่ามี unit test ของ service และ guard แล้ว

**ไม่ทำ**

- ไม่เปลี่ยน HTTP contract: path, method, status, ฟิลด์, ข้อความ error ของ 409/401 ที่เทสต์ผูกอยู่
- ไม่เปลี่ยน Prisma schema, migration, หรือชื่อคอลัมน์ (`passwordHash` คงเดิม)
- ไม่ย้าย generated client ไป `src/prisma/generated` (คงที่ `src/generated/prisma`)
- ไม่เปลี่ยน UUID เป็น Int, ไม่เพิ่มโมเดล `Todo`
- ไม่เปลี่ยนกลไก validation (คง `APP_PIPE` + `StandardSchemaValidationPipe`)
- ไม่เพิ่ม refresh token, role/authorization, Swagger, rate limit
- ไม่เปลี่ยน `PrismaService` ที่ normalize session เป็น UTC

**ถือว่าล้มเหลวถ้า**

- พฤติกรรม 400/401/409 เปลี่ยนจากที่ e2e ผูกไว้
- e2e ต้องรันตามลำดับพิเศษหรือ flaky
- unit test ต้อง mock ภายในของ Nest เอง หรืออ่านแล้วต้องเดาว่าเทสต์อะไร
- มีเทสต์ถูกปิด, `.skip`, หรือลด assertion เพื่อให้ผ่าน

## ข้อจำกัด

- ESM: relative import ลงท้าย `.js`, ไม่มี `__dirname`, รันเทสต์ด้วย Vitest (`vi.fn()` ไม่ใช่ `jest.fn()`)
- Node 26.13.1 ในเครื่อง (เอกสารเดิมเขียน 24), pnpm 12, PostgreSQL 18 ในเครื่อง; e2e ต้องมีฐาน `expense_tracker_test`
- pnpm 12 บล็อก build script ของ dependency ใหม่โดยปริยาย ต้องเพิ่ม `argon2: true` ใน `pnpm-workspace.yaml` หัวข้อ `allowBuilds` (ปัจจุบันอนุญาตเฉพาะ `@prisma/engines` กับ `prisma`) ไม่เช่นนั้น `argon2` จะไม่มี binary
- e2e สร้างแอปจาก `AppModule` ตรง ๆ ไม่ผ่าน `main.ts` จึงต้องคง `APP_PIPE` ไม่ย้าย pipe ไป `app.useGlobalPipes()`
- `@nestjs/config` 12: `validationSchema` รับ StandardSchemaV1 จึงส่ง Zod object ได้ตรง ๆ (ไม่ต้องใช้ `validate:` + spread เหมือนเดิม)
- เวอร์ชันที่เล็งไว้: `@nestjs/jwt` 12.0.5 (peer `@nestjs/common` ^12), `argon2` 0.45.2
- `PrismaService` เป็นคนเดียวที่แตะ connection string; ที่เหลือรับ `PrismaService` ผ่าน DI

## แนวทางที่พิจารณา

### ชั้นของฟีเจอร์

| แนวทาง | ลักษณะและข้อแลกเปลี่ยน |
| --- | --- |
| **Layered ครบทุกฟีเจอร์ (เลือก)** | ทั้ง `user` และ `expenses` มี repository + entity + `dto/`; service ไม่ import `PrismaService` เลย ไฟล์เพิ่มราว 10 ไฟล์และมี mapping หนึ่งชั้น แต่ตามรอยคำขอถึงคำสั่ง Prisma ได้ทางเดียวทุกฟีเจอร์ และตรงกับ repo ตัวอย่าง |
| Layered เฉพาะ `user` | แตะน้อยสุด แต่ฟีเจอร์หนึ่งมี repository อีกฟีเจอร์ไม่มี ขัดกับเป้าหมายเรื่องโครงสร้างที่สม่ำเสมอ |
| Thin repository | ย้าย query ไป repository แต่ไม่แยก entity/mapping ทำให้ type ของ Prisma ไหลถึง controller และ repository ไม่มีอะไรให้ทดสอบ |

เลือกแบบแรก เพราะผู้ใช้ต้องการเห็น "แนวคิดและการออกแบบ layer" ทั้งโปรเจกต์ ไม่ใช่แค่จุดเดียว

### ชั้น auth

| แนวทาง | ลักษณะและข้อแลกเปลี่ยน |
| --- | --- |
| คง `@nestjs/authentication` | เสถียรและสั้นที่สุด แต่กลไกซ่อนใน library ขัดกับเป้าหมายข้อ 2 |
| **เขียนเองด้วย `@nestjs/jwt` + `argon2` (เลือก)** | เห็นทุกขั้น: hash, sign, verify, guard, decorator เขียนเทสต์ได้ทุกชั้น แลกกับโค้ดที่ต้องดูแลเองและ dependency native หนึ่งตัว |
| `passport` + `passport-jwt` | เป็นมาตรฐานอุตสาหกรรม แต่เพิ่ม abstraction อีกชั้นที่ซ่อนการทำงานภายใน ซ้ำรอยปัญหาเดิม |

เลือกแบบที่สอง ตรงกับ repo ตัวอย่าง (`argon2` + `JwtModule`) และตอบโจทย์เรื่องการฝึกเขียนเทสต์

## โครงสร้างไฟล์เป้าหมาย

```
src/
  main.ts                        คงเดิม (enableShutdownHooks + listen)
  app.module.ts                  Config + Prisma + User + Auth + Expenses + APP_PIPE
  config/
    config.schema.ts             envSchema, type Env
  prisma/
    prisma.module.ts             @Global()
    prisma.service.ts            คงเดิม
  hasher/
    argon.service.ts             hash / verify (argon2)
    hasher.module.ts             exports ArgonService
  user/
    user.entity.ts               StoredUser, PublicUser, AuthenticatedUser
    user.repository.ts           findByEmail, findById, create (P2002 → null)
    user.service.ts              createAccount (hash + 409), lookup ให้ auth
    user.module.ts               exports UserService
  auth/
    auth.constants.ts            ACCESS_TOKEN_TTL_SECONDS = 900, issuer, audience
    auth.types.ts                AccessTokenResponse, AuthenticatedRequest
    dto/email.schema.ts          emailSchema ที่ signup และ login ใช้ร่วมกัน
    dto/signup.dto.ts            signupSchema, type SignUpDto
    dto/login.dto.ts             loginSchema, type LoginDto
    auth.service.ts              signup (ผ่าน UserService), login (verify + sign)
    auth.controller.ts           @Public() + @Body({ schema })
    guards/jwt-auth.guard.ts     Bearer → verify → โหลดผู้ใช้ → request.user
    decorators/public.decorator.ts
    decorators/current-user.decorator.ts
    auth.module.ts               JwtModule.registerAsync + APP_GUARD
  expenses/
    expense.entity.ts            ExpenseRecord, ExpenseResponse
    dto/expense-fields.schema.ts กติกาของ title/amount/spentOn/note ที่ create และ update ใช้ร่วมกัน
    dto/create-expense.dto.ts    createExpenseSchema, type CreateExpenseDto
    dto/update-expense.dto.ts    updateExpenseSchema, type UpdateExpenseDto
    dto/list-expenses.dto.ts     listExpensesSchema, type ListExpensesDto
    dto/expense-id.dto.ts        expenseIdSchema
    expenses.repository.ts       findPage, create, findOne, update, remove
    expenses.service.ts          business rules + mapping + 404
    expenses.controller.ts       @CurrentUser('id') + schema ของ param/query/body
    expenses.module.ts
test/
  app.e2e-spec.ts                แก้เฉพาะ assertion ของ hash
```

ลบ: `src/app.controller.ts`, `src/app.service.ts`, `src/auth/auth.schemas.ts`, `src/auth/jwt-auth.provider.ts`, `src/expenses/expenses.schemas.ts`

## รายละเอียดแต่ละชั้น

### config

`envSchema` ย้ายมาจาก `app.module.ts` ไป `config/config.schema.ts` พร้อม `export type Env = z.infer<typeof envSchema>` กติกายังเหมือนเดิม: `DATABASE_URL` เป็น postgres URL, `JWT_SECRET` ยาวอย่างน้อย 32 ไบต์ `app.module.ts` ใช้ `ConfigModule.forRoot({ isGlobal: true, validationSchema: envSchema })` และผู้ใช้ค่าใช้ `ConfigService<Env, true>` แบบ typed

### hasher

`ArgonService` ครอบ `argon2`: `hash(plain): Promise<string>` และ `verify(plain, hash | undefined): Promise<boolean>` (คืน `false` เมื่อไม่มี hash) `HasherModule` export service ตัวนี้ ไม่มี logic อื่น

### user

- `user.entity.ts`: `StoredUser { id, email, passwordHash, createdAt: Date }`, `PublicUser { id, email, createdAt: string }`, `AuthenticatedUser { id, email }` — type ของผู้ใช้อยู่ที่โดเมนผู้ใช้ ไม่ใช่ที่ auth เพื่อให้ทิศทางการ import เป็น `auth → user` ทางเดียว
- `user.repository.ts`: `findByEmail`, `findById`, `create` รับ `{ email, passwordHash }` คืน `StoredUser`; ถ้า Prisma โยน `P2002` คืน `null` (ให้ unique constraint ของ PostgreSQL เป็นตัวตัดสิน ไม่ใช้ `checkEmailExist()` แล้วค่อย `create` เพราะมี race)
- `user.service.ts`: `createAccount({ email, password })` เรียก `ArgonService.hash` แล้วสร้าง user, `null` → `ConflictException('Email already registered')`; `findByEmail` คืน `StoredUser | null` สำหรับล็อกอิน; `findAuthenticated(id)` คืน `AuthenticatedUser | null` สำหรับ guard
- `user.module.ts`: imports `HasherModule`, providers `UserRepository` + `UserService`, exports `UserService`

email ถูก trim และ lower-case ที่ schema ชั้น DTO เหมือนเดิม service ไม่ normalize ซ้ำ

schema ที่มากกว่าหนึ่ง input ใช้ร่วมกันให้วางไว้ใน `dto/` ด้วยไฟล์ลงท้าย `.schema.ts` (`dto/email.schema.ts`, `dto/expense-fields.schema.ts`) ไม่ทำสำเนากติกาไว้หลายไฟล์ เพราะสำเนาจะเพี้ยนจากกันได้และตารางค่าขอบในเทสต์จะครอบได้ตัวเดียว ส่วน `expenseIdSchema` มีไฟล์ของตัวเองอยู่แล้ว (`dto/expense-id.dto.ts`) เพราะเป็นกติกาเดียวที่ใช้ซ้ำ

### auth

- `auth.constants.ts`: `ACCESS_TOKEN_TTL_SECONDS = 900`, `JWT_ISSUER = 'expense-tracker-api'`, `JWT_AUDIENCE = 'expense-tracker-client'` — ที่เดียวที่กำหนดอายุ token ทั้งตอน sign และค่าที่ตอบกลับ
- `auth.module.ts`: `JwtModule.registerAsync({ inject: [ConfigService], useFactory })` ตั้ง `secret`, `signOptions: { expiresIn: ACCESS_TOKEN_TTL_SECONDS, issuer, audience }`, `verifyOptions: { issuer, audience }`; imports `UserModule` + `HasherModule`; providers `AuthService` และ `{ provide: APP_GUARD, useClass: JwtAuthGuard }`
- `auth.service.ts`: `signup(dto)` เรียก `UserService.createAccount`; `login(dto)` เรียก `UserService.findByEmail`, `ArgonService.verify`, แล้ว `JwtService.signAsync({ sub, email })` คืน `{ accessToken, expiresIn: ACCESS_TOKEN_TTL_SECONDS }` ทั้ง "ไม่พบอีเมล" และ "รหัสผ่านผิด" โยน `UnauthorizedException('Invalid email or password')` ข้อความเดียวกัน
- `jwt-auth.guard.ts`: ถ้า handler/class มี metadata public → คืน `true` โดยไม่ตรวจ token; อ่าน `Authorization` แบบ `Bearer <token>`, `JwtService.verifyAsync`, `UserService.findAuthenticated(sub)`, ใส่ `request.user`, โยน `UnauthorizedException` เมื่อขั้นใดขั้นหนึ่งล้มเหลว — guard อ่านผู้ใช้จากฐานข้อมูลทุกคำขอ (ไม่เชื่อ claims อย่างเดียว) เพื่อให้บัญชีที่ถูกลบแล้วถูกปฏิเสธ
- `public.decorator.ts`: `SetMetadata(IS_PUBLIC_KEY, true)` ใช้ได้ทั้ง class และ handler; guard ใช้ `Reflector.getAllAndOverride`
- `current-user.decorator.ts`: `createParamDecorator` อ่าน `request.user` รองรับ `@CurrentUser()` และ `@CurrentUser('id')` แบบ typed ด้วย key ของ `AuthenticatedUser`
- `auth.types.ts`: `AccessTokenResponse { accessToken: string; expiresIn: number }`, `AuthenticatedRequest` (Express `Request` + `user: AuthenticatedUser`) ไม่มี `declare module` augmentation อีก

`auth.controller.ts`: `@Public()` ที่ class, `POST /auth/signup` → 201, `POST /auth/login` → `@HttpCode(200)` ใช้ `@Body({ schema })` จากไฟล์ `dto/`

### expenses

- `expense.entity.ts`: `ExpenseRecord { id, title, amount: string, spentOn: Date, note: string | null, createdAt: Date, updatedAt: Date }` และ `ExpenseResponse` (wire shape, วันที่เป็น ISO string) — mapping จาก Prisma อยู่ที่ repository, mapping เป็น wire shape อยู่ที่ service
- `expenses.repository.ts`: `findPage(userId, { limit, offset })`, `create(userId, data)`, `findOne(userId, id)`, `update(userId, id, changes)`, `remove(userId, id)` ใช้ `where: { id, userId }` ทุกครั้งที่แตะรายการเดียว; `P2025` ของ update/delete แปลงเป็น `null` / `false` ไม่โยน exception ของ Prisma ออกไป
- `expenses.service.ts`: แปลง `spentOn` (`YYYY-MM-DD`) เป็น `Date` เที่ยงคืน UTC ก่อนเรียก repository, แปลง record → response, `null`/`false` → `NotFoundException('Expense not found')`, เรียง `spentOn desc, id desc` ผ่าน repository
- `expenses.controller.ts`: ใช้ `@CurrentUser('id')` แทน decorator ของ package, คง schema pipe ของ `@Param`/`@Query`/`@Body`

### app.module / main

`app.module.ts` ไม่มี `AppController`/`AppService` แล้ว คง providers `AppService`? — ไม่คง: providers เหลือเฉพาะ `{ provide: APP_PIPE, useClass: StandardSchemaValidationPipe }` และ imports `ConfigModule`, `PrismaModule`, `UserModule` (ถ้าไม่ถูกใช้ตรง ๆ ให้ import ผ่าน `AuthModule` เท่านั้น), `AuthModule`, `ExpensesModule` `main.ts` ไม่เปลี่ยน

## สัญญาที่ไม่เปลี่ยน

| Method | Path | ผลลัพธ์ |
| --- | --- | --- |
| `POST` | `/auth/signup` | `201` `{ id, email, createdAt }`, ซ้ำ → `409` |
| `POST` | `/auth/login` | `200` `{ accessToken, expiresIn: 900 }`, ผิด → `401` |
| `GET` | `/expenses` | `200` รายการของผู้ใช้ปัจจุบัน |
| `POST` | `/expenses` | `201` รายจ่ายที่สร้าง |
| `GET` | `/expenses/:id` | `200` / `404` |
| `PATCH` | `/expenses/:id` | `200` / `404` / `400` เมื่อว่าง |
| `DELETE` | `/expenses/:id` | `204` / `404` |

เส้นทาง `/auth/*` เข้าได้โดยไม่ต้องมี token เส้นทาง `/expenses/*` ต้องมี Bearer token ที่ผ่านการตรวจ issuer/audience และผู้ใช้ต้องยังมีอยู่ในฐานข้อมูล

## กลยุทธ์การทดสอบ

### หลักการเขียน unit test ให้อ่านง่าย

- หนึ่ง `it` ทดสอบหนึ่งพฤติกรรม ตั้งชื่อเป็นประโยคที่อ่านแล้วรู้ผลลัพธ์
- ใช้ `Test.createTestingModule` จริงทุกไฟล์ แต่แทน dependency ด้วยของปลอมที่เขียนมือ (plain object + `vi.fn()`) ประกาศไว้ใกล้เทสต์ที่ใช้ ไม่ใช้ `jest.mock` หรือ automock
- จัดเรียง Arrange / Act / Assert ด้วยบรรทัดว่าง ไม่ใส่คอมเมนต์ทุกบรรทัด
- assert สิ่งที่ผู้เรียกเห็น (ค่าที่คืน, exception, ข้อความ) ไม่ assert ลำดับการเรียกภายใน ยกเว้นกรณีที่ลำดับเป็นข้อกำหนดจริง เช่น hash ต้องเกิดก่อนเขียนฐานข้อมูล
- ถ้าเทสต์ต้องใช้ของปลอมเหมือนกันหลายตัว ให้ทำ helper function เล็ก ๆ ต่อไฟล์ (`function createService(...)`) แทน `beforeEach` ที่ซ่อนการตั้งค่า
- คอมเมนต์ในโค้ดและเทสต์เป็นภาษาอังกฤษตามไฟล์เดิม คำอธิบายว่าควรอ่านอะไรในแต่ละไฟล์อยู่ในเอกสารนี้

### ไฟล์เทสต์และสิ่งที่ครอบคลุม

| ไฟล์ | พฤติกรรม |
| --- | --- |
| `user/user.service.spec.ts` | hash ถูกเรียกก่อน `create`; `create` คืน `null` → `ConflictException`; `findAuthenticated` คืน `null` เมื่อไม่มีผู้ใช้ |
| `auth/auth.service.spec.ts` | ล็อกอินสำเร็จคืน token + `expiresIn` 900; ไม่พบอีเมลกับรหัสผ่านผิดได้ exception ชนิดและข้อความเดียวกัน; sign ถูกเรียกด้วย `{ sub, email }` |
| `auth/guards/jwt-auth.guard.spec.ts` | ไม่มี header → 401; token เสีย → 401; token ดีแต่ผู้ใช้หาย → 401; token ดี → คืน `true` และ `request.user` ถูกตั้ง; handler ที่ `@Public()` → ผ่านโดยไม่เรียก verify |
| `expenses/expenses.service.spec.ts` | `spentOn` ถูกส่งเป็น UTC midnight; record → response แปลง Decimal/Date ถูกต้อง; `null`/`false` จาก repository → `NotFoundException` |
| `expenses/expenses.schemas.spec.ts` | คงเดิม (ตารางค่าขอบของ `amount` และ `spentOn`) |

`expenses.schemas.spec.ts` ย้ายไปอยู่ข้าง schema ใหม่ใน `dto/` หรือคงที่เดิม —ผู้ลงมือเลือกได้โดยให้ import path ตรง

### e2e

`test/app.e2e-spec.ts` คงเทสต์เดิมทั้งหมด แก้เฉพาะ assertion ของ hash จาก `/^\$scrypt\$/` เป็น `/^\$argon2id\$/` (argon2id เป็นค่าเริ่มต้นของ `argon2.hash`) ไม่เพิ่มเทสต์ใหม่ในรอบนี้

### การตรวจรับ

`pnpm lint`, `pnpm test`, `pnpm test:e2e`, `pnpm build` ต้องผ่านทั้งหมด รายงานผลตามจริงถ้าฐานข้อมูลทดสอบไม่พร้อม

### สภาพแวดล้อมก่อนเริ่ม

`.env` ในเครื่องยังเป็นค่า placeholder: `DATABASE_URL`/`TEST_DATABASE_URL` ใช้ผู้ใช้ `your_local_user` ซึ่งไม่มีอยู่จริง และ `JWT_SECRET` ยาว 24 ไบต์ ต่ำกว่าเกณฑ์ 32 ไบต์ของ `envSchema` แปลว่าตอนนี้แอปไม่ผ่าน config validation และ `pnpm test:e2e` รันไม่ได้ ต้องแก้ `.env` (ไฟล์นี้ไม่ถูก track ใน git) ให้มีผู้ใช้ที่มีสิทธิ์สร้างฐาน, สร้าง `expense_tracker` กับ `expense_tracker_test`, และตั้ง `JWT_SECRET` ใหม่จาก `openssl rand -base64 32` ก่อน จึงจะเก็บ baseline "e2e เขียวก่อน refactor" ได้ ถ้าไม่พร้อม ให้ส่งงานโดยรายงานว่า e2e ไม่ได้รัน ไม่ลดหรือปิดเทสต์

ผู้ที่ถือรหัสผ่าน PostgreSQL ในเครื่องเป็นผู้ตัดสินใจว่าจะตั้งค่าเองหรือให้ผู้ลงมือตั้ง

## ความเสี่ยงและการรับมือ

| ความเสี่ยง | การรับมือ |
| --- | --- |
| `argon2` ติดตั้ง/build ไม่ผ่านบนเครื่อง | เพิ่ม `argon2: true` ใน `allowBuilds` ของ `pnpm-workspace.yaml` แล้วติดตั้งใหม่ ถ้ายังไม่ผ่านให้ **หยุดและถามก่อน** ไม่เปลี่ยนไป scrypt เงียบ ๆ เพราะกระทบ dependency, ตัว hasher, assertion ใน e2e และ README |
| `APP_GUARD` ใน `AuthModule` resolve dependency ไม่ได้ | ย้าย provider ไป `AppModule` และ export `JwtModule`/`UserModule` จาก `AuthModule` |
| `verifyOptions` ไม่ถูกใช้ตอน `verifyAsync` | ส่ง `{ issuer, audience }` ตรง ๆ ใน `verifyAsync` และมี unit test ยืนยันว่า token ที่ issuer ผิดถูกปฏิเสธ |
| ลืมว่า e2e สร้างแอปจาก `AppModule` | คง `APP_PIPE` และ guard ที่ลงทะเบียนผ่าน module |
| ลบ `app.controller.ts` แล้วมีที่อื่นอ้างถึง | ตรวจด้วย `grep` ก่อนลบ และ `pnpm build` เป็นตัวยืนยัน |
| `expiresIn` ไม่ตรงกับอายุ token จริง | ค่าทั้งสองมาจาก `ACCESS_TOKEN_TTL_SECONDS` ตัวเดียว |

## สิ่งที่เหลือให้ผู้ลงมือ

- ตั้งชื่อ method ของ repository ให้สอดคล้องกันทั้งสองฟีเจอร์ (`findPage` / `findOne` / `create` / `update` / `remove`)
- รายละเอียดของ type ที่ repository คืนในกรณีที่ต้อง `select` เฉพาะบางฟิลด์
- โครงของของปลอม (fake) ในไฟล์เทสต์ และ helper ที่ใช้ร่วมกันภายในไฟล์
- จำนวนเทสต์ย่อยในแต่ละไฟล์ ตามหลัก "หนึ่งพฤติกรรมต่อหนึ่ง `it`"
- การเรียง import และการจัดบรรทัดตาม `.prettierrc`
