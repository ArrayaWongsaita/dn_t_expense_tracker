# Expense Tracker API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **ถูกแทนที่แล้ว:** โครง auth และ layer ปัจจุบันดู `docs/superpowers/specs/2026-11-23-layered-refactor-design.md`

**Goal:** สร้าง API สำหรับสมัคร ล็อกอิน และจัดการรายจ่ายส่วนตัว พร้อมเทสที่รันกับ PostgreSQL ในเครื่องได้

**Architecture:** `AppModule` ประกอบด้วย Prisma, Auth และ Expenses modules บน Express. Guard ของ Nest ยืนยันบัญชีก่อนส่ง ID ให้คำสั่ง Prisma ที่อ่านหรือแก้เฉพาะข้อมูลของบัญชีนั้น

**Tech Stack:** NestJS 12.6.0, TypeScript ESM, pnpm, Prisma ORM 7, PostgreSQL, Zod, Vitest และ Supertest

**Spec:** [Expense Tracker API design](../specs/2026-11-22-expense-tracker-api-design.md)

## Global Constraints

- ใช้ NestJS 12.6.0 แบบ ESM เขียน relative imports ลงท้ายด้วย `.js` และใช้ Express adapter จาก scaffold
- ใช้ `@nestjs/authentication`, `@nestjs/config` และ `StandardSchemaValidationPipe` ผ่าน `APP_PIPE`
- ใช้ Prisma ORM 7 กับ `PrismaPg` และสร้าง client ใต้ `src/generated/prisma` แบบ ESM
- ใช้ PostgreSQL ที่มีอยู่ที่ `127.0.0.1:5432` ร่วมกัน ฐานพัฒนา `expense_tracker` ใช้ `DATABASE_URL` ฐานเทส `expense_tracker_test` ใช้ `TEST_DATABASE_URL`
- JWT อายุ 15 นาที ผ่าน `Authorization: Bearer <token>` โดยมี `JWT_SECRET`, issuer และ audience
- จำนวนเงิน THB เป็น string สองตำแหน่งช่วง `"0.01"` ถึง `"9999999999.99"` วันที่รายจ่ายใช้ `YYYY-MM-DD` ปี `0001` ถึง `9999`
- ใช้ e2e 8 พฤติกรรมจาก spec และ unit test แบบตารางหนึ่งไฟล์
- Checkout ปัจจุบันมี scaffold เป็น untracked files และ HEAD มีเฉพาะ spec ให้เริ่มจาก checkout ที่มี scaffold ครบ และบันทึกไฟล์ scaffold ก่อนสร้าง commit ของฟีเจอร์

## Review Focus

- สมัครอีเมลเดียวกันพร้อมกันด้วยตัวพิมพ์ต่างกัน ได้ `201` หนึ่งคำขอและ `409` หนึ่งคำขอ (Task 2)
- Bearer token ที่รูปแบบไม่ถูกต้องได้ `401` (Task 2)
- ชื่อฐานพัฒนาที่ถูกส่งมาใน `TEST_DATABASE_URL` ทำให้คำสั่งเทสหยุดก่อน migration (Task 1)
- `PATCH {}` ได้ `400` และ `PATCH { "note": null }` ล้างหมายเหตุได้ (Task 3)
- `limit` ซ้ำหรือ `offset` ที่ส่งเป็นค่าว่างได้ `400` (Task 3)

---

## แผนผังไฟล์

| ไฟล์                                                                                                                           | หน้าที่                                                                      |
| ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `.env.example`, `.gitignore`, `package.json`, `pnpm-lock.yaml`                                                                | URL ฐานพัฒนาและฐานเทสบน PostgreSQL ในเครื่อง และคำสั่ง Prisma                  |
| `prisma.config.ts`, `prisma/schema.prisma`, `prisma/migrations/*_init/migration.sql`, `prisma/migrations/migration_lock.toml` | Prisma CLI, โมเดล และ migration แรก                                       |
| `src/prisma/prisma.module.ts`, `src/prisma/prisma.service.ts`                                                                 | Prisma provider และ lifecycle                                             |
| `src/app.module.ts`, `src/main.ts`, `src/app.controller.ts`                                                                   | ประกอบโมดูล ตรวจ config ใช้ shutdown hooks และระบุเส้นทาง scaffold เป็น public |
| `src/auth/auth.module.ts`, `src/auth/auth.controller.ts`, `src/auth/auth.service.ts`                                          | ตั้งค่า JWT และรับสมัครกับล็อกอิน                                                 |
| `src/auth/auth.schemas.ts`, `src/auth/auth.types.ts`, `src/auth/jwt-auth.provider.ts`                                         | ตรวจ input, declare authentication types และค้นหาบัญชีจาก token              |
| `src/expenses/expenses.module.ts`, `src/expenses/expenses.controller.ts`, `src/expenses/expenses.service.ts`                  | อ่านและเขียนรายจ่ายที่กรองตามเจ้าของ                                            |
| `src/expenses/expenses.schemas.ts`, `src/expenses/expenses.schemas.spec.ts`                                                   | กติกา input และ unit test แบบตาราง                                         |
| `scripts/test-e2e.mjs`, `vitest.config.e2e.ts`, `test/app.e2e-spec.ts`                                                        | เตรียมฐานเทส รันตามลำดับ และทดสอบผ่าน HTTP                                    |
| `README.md`                                                                                                                   | ขั้นตอนเริ่มต้นและตัวอย่างเรียก API                                               |

### Task 1 — PostgreSQL, Prisma และระบบรัน e2e

**Interfaces** — `PrismaModule` export `PrismaService extends PrismaClient` จาก `src/prisma/prisma.service.ts` สำหรับ inject ใน service และดึงด้วย `app.get(PrismaService)` ในเทส `pnpm test:e2e` ส่งอาร์กิวเมนต์ Vitest ต่อได้และใช้ฐาน `expense_tracker_test`

- [ ] ตรวจรายการ untracked กับ scaffold แล้วรัน `pnpm test` และ `pnpm test:e2e` ให้ชุดตัวอย่างผ่านอย่างละหนึ่ง test บันทึก baseline ด้วย `git add -- .gitattributes .gitignore .oxlintrc.json .prettierrc AGENTS.md README.md nest-cli.json package.json pnpm-lock.yaml src/app.controller.spec.ts src/app.controller.ts src/app.module.ts src/app.service.ts src/main.ts test/app.e2e-spec.ts tsconfig.build.json tsconfig.json vitest.config.e2e.ts vitest.config.ts` และ `git commit -m "chore: record NestJS starter"`
- [ ] เพิ่ม assertion ชั่วคราวใน `test/app.e2e-spec.ts` ให้ทดสอบว่าแอปที่ตอบ `GET /` ใช้ Prisma และต่อฐานเทสจริง คง assertion นี้จนกว่าชุด auth จะเข้ามาแทนใน Task 2

  ```ts
  await request(app.getHttpServer()).get('/').expect(200, 'Hello World!');
  const prisma = app.get(PrismaService);
  const databases = await prisma.$queryRaw<
    { name: string }[]
  >`SELECT current_database() AS name`;
  expect(databases).toEqual([{ name: 'expense_tracker_test' }]);
  ```

- [ ] รัน `pnpm test:e2e` และยืนยันว่าเทสหยุดเพราะยัง resolve `PrismaService` ไม่ได้
- [ ] ตรวจ runtime และ peer dependencies แล้วติดตั้ง `prisma`, `@prisma/client`, `@prisma/adapter-pg` ที่เป็น 7.x รุ่นเดียวกัน พร้อม `pg`, `dotenv`, Zod 4 และ `@nestjs/config` ที่รองรับ NestJS 12.6.0 เก็บเวอร์ชันจริงใน lockfile
- [ ] ใส่ URL ของฐาน `expense_tracker` และ `expense_tracker_test` บน `127.0.0.1:5432` ด้วยตัวอย่างชื่อผู้ใช้และรหัสผ่าน พร้อมช่อง `JWT_SECRET` ใน `.env.example`
- [ ] เขียน `prisma.config.ts` ให้โหลด `dotenv/config` และส่ง `process.env.DATABASE_URL` ให้ datasource เพื่อให้ `prisma generate` ทำงานได้ตอนที่ยังตั้งค่า DB ไม่ครบ เพิ่ม generator `prisma-client` ด้วย `moduleFormat = "esm"`, `importFileExtension = "js"` และ output ตาม spec ใส่ generated path ใน `.gitignore`. [Prisma Config API](https://www.prisma.io/docs/orm/v7/reference/prisma-config-reference#handling-optional-environment-variables)
- [ ] เขียน schema ให้ใช้ UUID เป็น primary key ทั้งสองตาราง, `User.email @unique`, foreign key `Expense.userId`, index `[userId, spentOn, id]`, `amount Decimal @db.Decimal(12, 2)`, `spentOn DateTime @db.Date`, `note String?` และ timestamps ตาม spec
- [ ] ใช้ PostgreSQL ที่รันอยู่ที่พอร์ต `5432` สร้าง `expense_tracker` และ `expense_tracker_test` ถ้ายังไม่มี โดยใช้ role ในเครื่องเป็นเจ้าของฐาน ตรวจการเชื่อมต่อทั้งสองฐานด้วย `SELECT current_database()` และตรวจว่า role ที่ใช้กับ `migrate dev` สร้าง shadow database ชั่วคราวได้. [Prisma Shadow Database](https://www.prisma.io/docs/orm/v7/prisma-migrate/understanding-prisma-migrate/shadow-database#shadow-database-user-permissions)
- [ ] เตรียม `.env` จาก `.env.example` โดยใช้ credentials ของ role ในเครื่องและใช้ `openssl rand -base64 32` สร้างค่า `JWT_SECRET`
- [ ] สร้าง migration ด้วย `pnpm exec prisma migrate dev --name init --create-only` เพิ่ม SQL check ที่กำหนด `amount > 0` ใน migration แล้วใช้ `pnpm exec prisma migrate dev` กับฐานพัฒนา
- [ ] เพิ่ม script `db:generate` ให้เรียก `prisma generate` และให้ `build` ใช้ `pnpm db:generate && nest build` ตั้ง `AppModule` ให้ใช้ ConfigModule และ APP_PIPE ตรวจ `DATABASE_URL` เป็น PostgreSQL URL และ `JWT_SECRET` ยาวอย่างน้อย 32 bytes ใช้ `PrismaPg` ใน PrismaService โดยเชื่อมตอน init และ disconnect ตอน destroy เปิด shutdown hooks ใน `main.ts`
- [ ] เปลี่ยน `test:e2e` เป็น `node scripts/test-e2e.mjs` ให้ script โหลด env ตรวจ protocol และ pathname ของ `TEST_DATABASE_URL` เท่ากับ `/expense_tracker_test` แล้วรัน `pnpm exec prisma migrate deploy` และ `pnpm exec vitest run --config ./vitest.config.e2e.ts` ด้วย env เดียวกันที่ตั้ง `DATABASE_URL` เป็น URL ฐานเทส ส่งอาร์กิวเมนต์จากผู้ใช้ต่อให้ Vitest และส่ง exit status กลับ ตั้ง `fileParallelism: false` ใน e2e config และให้เทสปิดแอปหลังจบ
- [ ] รัน `TEST_DATABASE_URL=postgresql://unused@127.0.0.1:1/expense_tracker pnpm test:e2e` ด้วย URL จำลอง คาดว่า exit nonzero พร้อมข้อความระบุชื่อฐานที่ต้องการก่อนเรียก Prisma จากนั้นรัน `pnpm db:generate`, `pnpm test:e2e` และ `pnpm build` ด้วย config สำหรับเครื่องที่เตรียมแล้ว คาดว่า migration ทำงานบนฐานเทสและ assertion ได้ `expense_tracker_test`
- [ ] Stage ไฟล์ Task 1 ตามแผนผัง รวม migration และ lockfile แล้ว commit ด้วย `git commit -m "feat: connect NestJS to local PostgreSQL with Prisma 7"`

### Task 2 — สมัคร ล็อกอิน และอ่านรายจ่ายของบัญชี

**Interfaces** — `AuthService.signup(input: SignUpInput): Promise<PublicUser>` และ `AuthService.login(input: LoginInput): Promise<AccessTokenResponse>` infer input types ใน `auth.schemas.ts` และประกาศ response types ใน `auth.types.ts` พร้อมตั้ง `AuthenticationTypes.user` เป็น `AuthenticatedUser = { id: string; email: string }` และ `refreshTokens: false` ฝั่งรายจ่ายมี `ExpensesService.list(userId: string, query: ListExpensesQuery): Promise<ExpenseResponse[]>` โดย infer `ListExpensesQuery` จาก `listExpensesSchema` และใช้ `ExpenseResponse` ตามฟิลด์ใน spec

- [ ] แทนเทส scaffold ใน `test/app.e2e-spec.ts` ด้วย e2e 4 พฤติกรรมตามตัวอย่างด้านล่าง เปิด `AppModule` หนึ่งครั้ง ใช้ email ที่มี UUID ต่อ fixture และเก็บ ID จาก signup ที่ได้ `201` ลบ `Expense` แล้ว `User` เฉพาะตาม ID ของ fixture ใน `afterEach` แล้ว `app.close()` ใน `afterAll`

  ```ts
  // สมัครและล็อกอิน
  expect(signup.status).toBe(201);
  expect(Object.keys(signup.body).sort()).toEqual(['createdAt', 'email', 'id']);
  expect(signup.body.email).toBe(normalizedEmail);
  expect(login.status).toBe(200);
  expect(login.body).toEqual({
    accessToken: expect.any(String),
    expiresIn: 900,
  });
  await api()
    .get('/expenses')
    .set('Authorization', `Bearer ${login.body.accessToken}`)
    .expect(200, []);

  // อีเมลซ้ำพร้อมกัน โดยเปลี่ยนตัวพิมพ์และใส่ช่องว่าง
  expect([first.status, second.status].sort()).toEqual([201, 409]);

  // รหัสผ่านผิด
  await api()
    .post('/auth/login')
    .send({ email, password: 'incorrect password' })
    .expect(401);

  // คำขอยืนยันตัวตนไม่สำเร็จ
  await api().get('/expenses').expect(401);
  await api()
    .get('/expenses')
    .set('Authorization', 'Bearer invalid-token')
    .expect(401);
  ```

- [ ] รัน `pnpm test:e2e` คาดว่าได้ `404` สำหรับ endpoint ที่ยังไม่ได้สร้าง
- [ ] เพิ่ม `@nestjs/authentication` รุ่นที่ตรงกับ Nest 12.6.0 กำหนด `signUpSchema` และ `loginSchema` แบบ strict ใน `src/auth/auth.schemas.ts` ให้ normalize อีเมลด้วย trim และ lowercase ก่อน validate signup จำกัดรหัสผ่าน 12–128 ตัวอักษรและ login 1–128 ตัวอักษร
- [ ] เขียน `AuthService` ให้ signup hash ด้วย `PasswordHasher`, insert และเลือกเฉพาะฟิลด์สาธารณะ แปลง `P2002` เป็น `409` ฝั่ง login เรียก `PasswordHasher.verify` แม้หาอีเมลไม่เจอ ส่ง `401` ข้อความเดียวกันเมื่อ credentials ไม่ผ่าน และใช้ `TokenService.issue(user.id, { method: 'password' })` เมื่อผ่าน
- [ ] เขียน `JwtAuthProvider.validate({ sub }: JwtClaims): Promise<AuthenticatedUser | null>` ให้ค้นหาบัญชีจาก `sub` และเลือก `id`, `email` ลงทะเบียน provider กับ `AuthenticationRegistry` ตั้ง `AuthenticationModule.forRootAsync` ด้วย `ttl: '15m'`, issuer `expense-tracker-api`, audience `expense-tracker-client` และ `refreshToken: false`. [NestJS JWT Authentication](https://docs.nestjs.com/security/authentication#issue-tokens-to-the-mobile-app)
- [ ] ลงทะเบียน `AuthModule` และเขียน `AuthController` ให้ `POST /auth/signup` ตอบ `201` และ `POST /auth/login` ตอบ `200` ด้วย Standard Schema body ทั้งคู่ ใช้ `@Public()` ที่ auth controller และที่ `GET /` จาก scaffold
- [ ] ลงทะเบียน `ExpensesModule` และเปิด `GET /expenses` ให้ controller รับ `@CurrentUser('id')` จาก guard และ parse `listExpensesSchema` แบบ strict กำหนด `limit` เป็นจำนวนเต็ม 1–100 ค่าเริ่มต้น 20 และ `offset` 0–2,147,483,647 ค่าเริ่มต้น 0 รับค่า query เป็นเลขฐานสิบแบบ string หนึ่งค่าต่อฟิลด์ ให้ service ใช้ `findMany` โดยกรอง `userId`, เรียง `spentOn DESC, id DESC` และใช้ `take` กับ `skip` แปลงผลลัพธ์ผ่าน `toExpenseResponse(expense: Expense): ExpenseResponse` ใน service โดยส่งเงินสองตำแหน่งและแปลงวันที่กับ timestamps เป็น ISO ในรูปแบบที่ spec กำหนด
- [ ] รัน `pnpm test:e2e`, `pnpm exec tsc --noEmit` และ `pnpm build` คาดว่า e2e ผ่าน 4 พฤติกรรมและคำสั่ง TypeScript กับ build ออกด้วยสถานะ 0
- [ ] Stage ไฟล์ auth, expenses, การประกอบ AppModule, e2e และ dependency ของ Task 2 แล้ว commit ด้วย `git commit -m "feat: add JWT sign-in and personal expense listing"`

### Task 3 — CRUD รายจ่ายและวิธีใช้งานจาก checkout ใหม่

**Interfaces** — เพิ่ม `ExpensesService.create(userId: string, input: CreateExpenseInput): Promise<ExpenseResponse>`, `get(userId: string, id: string): Promise<ExpenseResponse>`, `update(userId: string, id: string, input: UpdateExpenseInput): Promise<ExpenseResponse>` และ `remove(userId: string, id: string): Promise<void>` รับ input จาก `createExpenseSchema`, `updateExpenseSchema` และ `expenseIdSchema` ใน `src/expenses/expenses.schemas.ts`

- [ ] เพิ่ม unit test แบบตารางใน `src/expenses/expenses.schemas.spec.ts` โดยทดสอบ schema ผ่าน `safeParse`

  ```ts
  expect(
    createExpenseSchema.safeParse({ ...validExpense, amount }).success,
  ).toBe(valid);
  // amount: '0.01' และ '9999999999.99' ผ่าน
  // amount: '0.00', '-1.00', '1.234', '10000000000.00' และ 125.5 ได้ false
  expect(
    createExpenseSchema.safeParse({ ...validExpense, spentOn }).success,
  ).toBe(valid);
  // spentOn: '2024-02-29' และ '0001-01-01' ผ่าน
  // spentOn: '2025-02-29', '0000-01-01' และ '2026-11-22T00:00:00Z' ได้ false
  ```

- [ ] เพิ่ม e2e 4 พฤติกรรมในไฟล์เดิม โดยใช้ผู้ใช้คนละ fixture ต่อกรณีและใช้ `{ title: 'Lunch', amount: '125.50', spentOn: '2026-11-22', note: 'receipt' }` เป็นข้อมูลตัวอย่าง

  ```ts
  // CRUD
  expect(created.status).toBe(201);
  expect(readBack.status).toBe(200);
  expect(readBack.body).toMatchObject({
    id,
    amount: '125.50',
    spentOn: '2026-11-22',
  });
  expect(emptyPatch.status).toBe(400);
  expect(patched.status).toBe(200);
  expect(patched.body).toMatchObject({ id, amount: '130.25', note: null });
  expect(removed.status).toBe(204);
  expect(removed.text).toBe('');
  expect(readAfterDelete.status).toBe(404);

  // Invalid input
  expect(tooManyDecimals.status).toBe(400); // amount: '125.501'
  expect(forgedOwner.status).toBe(400); // valid data plus userId
  expect(afterInvalidRequests.body).toEqual([]);

  // Ownership จากการล็อกอินของ A และ B แยกกัน
  expect(listForA.body.map(({ id }) => id)).toEqual([expenseOfA.id]);
  expect([readBAsA.status, patchBAsA.status, deleteBAsA.status]).toEqual([
    404, 404, 404,
  ]);
  expect(readBAsB.body).toEqual(expenseOfB);

  // เรียงวันก่อน และใช้ ID แบบ descending เมื่อวันเดียวกัน
  expect(all.body.map(({ id }) => id)).toEqual([
    higherIdOnSameDay,
    lowerIdOnSameDay,
    olderId,
  ]);
  expect(page.body.map(({ id }) => id)).toEqual([lowerIdOnSameDay]); // limit=1&offset=1
  expect([repeatedLimit.status, emptyOffset.status]).toEqual([400, 400]);
  ```

- [ ] รัน `pnpm test src/expenses/expenses.schemas.spec.ts` และ `pnpm test:e2e` คาดว่า unit test ยังไม่มี schema สำหรับสร้างรายจ่าย และ e2e ที่เรียก CRUD ยังได้ `404`
- [ ] เขียน expense schemas ให้ใช้ค่าตาม spec โดย trim title และ note, ตรวจ amount แบบ string สองตำแหน่งก่อนแปลง, ตรวจวันจริงตามปฏิทินและปีตั้งแต่ 0001, default note เป็น `null` ตอนสร้าง, ใช้ `null` สำหรับล้าง note ตอนแก้ และ require อย่างน้อยหนึ่งฟิลด์ใน PATCH ใช้ schema แบบ strict เพื่อให้ field เกินได้ `400`
- [ ] เติม service ทั้งสี่เมธอด ใช้ `userId` จาก guard ใน create และใช้ `where: { id, userId }` ใน get, update และ remove แปลงวันเป็น `Date` ที่เที่ยงคืน UTC ตอนเขียน ใช้ตัวแปลง response ของ Task 2 และแปลง `null` จาก get หรือ `P2025` จาก update/remove เป็น `404`
- [ ] เติม `POST /expenses` (`201`), `GET /expenses/:id` (`200`), `PATCH /expenses/:id` (`200`) และ `DELETE /expenses/:id` (`204`) ใน controller ใช้ `@CurrentUser('id')` กับทุกเส้นทางและผูก UUID schema สำหรับ `:id` ผ่าน `@Param`
- [ ] ลบ `src/app.controller.spec.ts` ที่ทดสอบข้อความ scaffold เพื่อให้ `pnpm test` ใช้ชุด schema โดยตรง
- [ ] เขียน `README.md` ให้เริ่มจาก `pnpm install --frozen-lockfile`, เตรียมสองฐานบน PostgreSQL ในเครื่องที่พอร์ต `5432`, สร้าง `.env` จากตัวอย่างและสร้าง JWT secret, รัน `pnpm exec prisma migrate dev`, `pnpm db:generate` และ `pnpm start:dev` แสดง curl สำหรับ signup, login และสร้างรายจ่ายด้วย Bearer token พร้อมคำสั่ง unit/e2e และชื่อฐานที่แต่ละคำสั่งใช้
- [ ] รัน `pnpm test`, `pnpm test:e2e` สองรอบ, `pnpm exec tsc --noEmit`, `pnpm lint` และ `pnpm build` คาดว่า unit ผ่านหนึ่งไฟล์, e2e ผ่าน 8 พฤติกรรมทั้งสองรอบ และคำสั่งตรวจอื่นออกด้วยสถานะ 0 ลองลำดับ curl ใน README บนฐาน dev ด้วย fixture ของตัวเองและตรวจ `201 → 200 → 201`
- [ ] Stage ไฟล์ CRUD, tests และ README ของ Task 3 แล้ว commit ด้วย `git commit -m "feat: complete personal expense CRUD and tests"`
