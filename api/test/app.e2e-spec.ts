import { randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Expense Tracker API', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const userIds = new Set<string>();
  const password = ' correct horse battery ';

  const api = () => request(app.getHttpServer());
  const newEmail = () => `expense-${randomUUID()}@example.com`;
  const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
  const expenseInput = {
    title: 'Lunch',
    amount: '125.50',
    spentOn: '2026-11-22',
    note: 'receipt',
  };

  async function signup(email: string) {
    const response = await api().post('/auth/signup').send({ email, password });
    if (response.status === 201) {
      userIds.add(response.body.id);
    }
    return response;
  }

  async function createAccount() {
    const email = newEmail();
    const account = await signup(email);
    expect(account.status).toBe(201);
    const login = await api()
      .post('/auth/login')
      .send({ email, password })
      .expect(200);
    return {
      id: account.body.id as string,
      headers: bearer(login.body.accessToken as string),
    };
  }

  beforeAll(async () => {
    const databaseUrl = new URL(process.env.DATABASE_URL ?? '');
    databaseUrl.searchParams.set('options', '-c timezone=Asia/Bangkok');
    vi.stubEnv('DATABASE_URL', databaseUrl.toString());

    const { AppModule } = await import('../src/app.module.js');
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterEach(async () => {
    const ids = [...userIds];
    if (ids.length > 0) {
      await prisma.$transaction([
        prisma.expense.deleteMany({ where: { userId: { in: ids } } }),
        prisma.user.deleteMany({ where: { id: { in: ids } } }),
      ]);
      userIds.clear();
    }
  });

  afterAll(async () => {
    await app?.close();
    vi.unstubAllEnvs();
  });

  it('registers an account and logs in to its expense list', async () => {
    const email = newEmail();
    const account = await signup(` ${email.toUpperCase()} `);
    expect(account.status).toBe(201);
    expect(Object.keys(account.body).sort()).toEqual([
      'createdAt',
      'email',
      'id',
    ]);
    expect(account.body.email).toBe(email);

    const [storedTimestamp] = await prisma.$queryRaw<{ epochMs: number }[]>`
      SELECT (EXTRACT(EPOCH FROM "createdAt") * 1000)::double precision AS "epochMs"
      FROM "User" WHERE "id" = ${account.body.id}::uuid
    `;
    expect(Date.parse(account.body.createdAt)).toBe(storedTimestamp.epochMs);

    const stored = await prisma.user.findUniqueOrThrow({
      where: { id: account.body.id },
      select: { passwordHash: true },
    });
    expect(stored.passwordHash).toMatch(/^\$argon2id\$/);

    const login = await api().post('/auth/login').send({ email, password });
    expect(login.status).toBe(200);
    expect(login.body).toEqual({
      accessToken: expect.any(String),
      expiresIn: 900,
    });
    await api()
      .get('/expenses')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200, []);
  });

  it('allows only one concurrent signup for a normalized email', async () => {
    const email = newEmail();
    const [first, second] = await Promise.all([
      signup(email),
      signup(` ${email.toUpperCase()} `),
    ]);
    expect([first.status, second.status].sort((a, b) => a - b)).toEqual([
      201, 409,
    ]);
  });

  it('rejects incorrect credentials with the same response for unknown accounts', async () => {
    const email = newEmail();
    expect((await signup(email)).status).toBe(201);
    const wrongPassword = await api()
      .post('/auth/login')
      .send({ email, password: 'incorrect password' })
      .expect(401);
    const unknownEmail = await api()
      .post('/auth/login')
      .send({ email: newEmail(), password })
      .expect(401);
    expect(unknownEmail.body).toEqual(wrongPassword.body);
  });

  it('requires a valid bearer token for expenses', async () => {
    await api().get('/expenses').expect(401);
    await api()
      .get('/expenses')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);
  });

  it('creates, reads, patches, and deletes an expense', async () => {
    const { headers } = await createAccount();
    const created = await api()
      .post('/expenses')
      .set(headers)
      .send(expenseInput)
      .expect(201);
    const path = `/expenses/${created.body.id}`;
    expect(created.body).toEqual({
      id: expect.any(String),
      ...expenseInput,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });

    await api().get(path).set(headers).expect(200, created.body);
    await api().patch(path).set(headers).send({}).expect(400);

    const updated = await api()
      .patch(path)
      .set(headers)
      .send({ amount: '130.25' })
      .expect(200);
    expect(updated.body).toMatchObject({ amount: '130.25', note: 'receipt' });
    const cleared = await api()
      .patch(path)
      .set(headers)
      .send({ note: null })
      .expect(200);
    expect(cleared.body).toMatchObject({ amount: '130.25', note: null });
    await api().get(path).set(headers).expect(200, cleared.body);

    const removed = await api().delete(path).set(headers).expect(204);
    expect(removed.text).toBe('');
    await api().get(path).set(headers).expect(404);
  });

  it('rejects invalid expense data without creating a record', async () => {
    const owner = await createAccount();
    await api()
      .post('/expenses')
      .set(owner.headers)
      .send({ ...expenseInput, amount: '125.501' })
      .expect(400);
    await api()
      .post('/expenses')
      .set(owner.headers)
      .send({ ...expenseInput, userId: owner.id })
      .expect(400);
    await api().get('/expenses/not-a-uuid').set(owner.headers).expect(400);
    await api().get('/expenses').set(owner.headers).expect(200, []);
  });

  it('scopes listing, reading, editing, and deleting to the signed-in account', async () => {
    const first = await createAccount();
    const second = await createAccount();
    const own = await api()
      .post('/expenses')
      .set(first.headers)
      .send(expenseInput)
      .expect(201);
    const other = await api()
      .post('/expenses')
      .set(second.headers)
      .send(expenseInput)
      .expect(201);
    const otherPath = `/expenses/${other.body.id}`;

    await api().get('/expenses').set(first.headers).expect(200, [own.body]);
    await api().get(otherPath).set(first.headers).expect(404);
    await api()
      .patch(otherPath)
      .set(first.headers)
      .send({ title: 'Changed by another account' })
      .expect(404);
    await api().delete(otherPath).set(first.headers).expect(404);
    await api().get(otherPath).set(second.headers).expect(200, other.body);
  });

  it('lists pages by newest date and descending ID', async () => {
    const { headers } = await createAccount();
    const first = await api()
      .post('/expenses')
      .set(headers)
      .send(expenseInput)
      .expect(201);
    const second = await api()
      .post('/expenses')
      .set(headers)
      .send(expenseInput)
      .expect(201);
    const older = await api()
      .post('/expenses')
      .set(headers)
      .send({ ...expenseInput, spentOn: '2026-11-20' })
      .expect(201);
    const [lower, higher] = [
      first.body.id as string,
      second.body.id as string,
    ].sort((a, b) => a.localeCompare(b));

    const all = await api().get('/expenses').set(headers).expect(200);
    expect(all.body.map(({ id }: { id: string }) => id)).toEqual([
      higher,
      lower,
      older.body.id,
    ]);
    const page = await api()
      .get('/expenses?limit=1&offset=1')
      .set(headers)
      .expect(200);
    expect(page.body.map(({ id }: { id: string }) => id)).toEqual([lower]);
    await api().get('/expenses?limit=1&limit=2').set(headers).expect(400);
    await api().get('/expenses?offset=').set(headers).expect(400);
  });
});
