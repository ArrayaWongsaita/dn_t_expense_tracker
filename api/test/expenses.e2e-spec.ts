// ============================================================
// บทที่ 4: E2E test ของ API ด้วย supertest
// ============================================================
// E2E (end-to-end) = ยิง HTTP request เข้า "แอป Nest ทั้งตัว" เหมือนลูกค้าจริง
// แล้วเช็ค status code และ body ที่ตอบกลับ ผ่าน controller → guard → service → repository
//
// supertest คืออะไร? ไลบรารีที่ยิง request เข้าแอปโดยไม่ต้องเปิดพอร์ตจริง:
//   request(app.getHttpServer()).post('/path').send({...}).expect(201)
//
// ไม่ต้องมี DB: เราใช้ overrideProvider สลับ repository จริง ๆ
// เป็นตัวปลอมที่เก็บข้อมูลในหน่วยความจำ (ดูโฟลเดอร์ test/fakes)
//
// รันเทส:  pnpm test:e2e

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { ExpensesRepository } from '../src/expenses/expenses.repository.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { UserRepository } from '../src/user/user.repository.js';
import { InMemoryExpensesRepository } from './fakes/in-memory-expenses.repository.js';
import { InMemoryUserRepository } from './fakes/in-memory-user.repository.js';

describe('Expenses API (e2e)', () => {
  let app: INestApplication<App>;
  const password = 'correct horse battery';
  const expenseInput = {
    title: 'Lunch',
    amount: '125.50',
    spentOn: '2026-11-22',
    note: 'receipt',
  };

  // ฟังก์ชันช่วย: ยิงเข้าแอปที่สร้างไว้
  const api = () => request(app.getHttpServer());

  // ฟังก์ชันช่วย: สมัครสมาชิก + ล็อกอิน แล้วคืน header Authorization พร้อมใช้
  async function signupAndLogin(email: string) {
    await api().post('/auth/signup').send({ email, password }).expect(201);
    const login = await api()
      .post('/auth/login')
      .send({ email, password })
      .expect(200);
    return { Authorization: `Bearer ${login.body.accessToken as string}` };
  }

  // beforeAll = รัน 1 ครั้ง "ก่อนเทสทั้งหมด" เพื่อสร้างแอป
  beforeAll(async () => {
    // แอปต้องการ env สองตัวนี้ตอนเริ่ม เราใส่ค่าปลอมให้ (ไม่ได้เชื่อมต่อ DB จริง)
    vi.stubEnv('DATABASE_URL', 'postgresql://fake:fake@127.0.0.1:5432/fake');
    vi.stubEnv('JWT_SECRET', 'test-secret-that-is-at-least-32-bytes-long');

    // import AppModule หลังตั้ง env เพื่อให้มันอ่านค่าที่เราตั้ง
    const { AppModule } = await import('../src/app.module.js');

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      // overrideProvider = "ตรงไหนที่ขอ X ให้ใช้ Y แทน"
      .overrideProvider(PrismaService)
      .useValue({}) // ไม่ใช้ DB จริง
      .overrideProvider(UserRepository)
      .useClass(InMemoryUserRepository)
      .overrideProvider(ExpensesRepository)
      .useClass(InMemoryExpensesRepository)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  // afterAll = รัน 1 ครั้ง "หลังเทสทั้งหมด" เพื่อปิดแอป
  afterAll(async () => {
    await app.close();
    vi.unstubAllEnvs();
  });

  it('signup returns the new user without password data', async () => {
    const response = await api()
      .post('/auth/signup')
      .send({ email: 'a@example.com', password })
      .expect(201);

    expect(response.body.email).toBe('a@example.com');
    expect(response.body).not.toHaveProperty('password');
    expect(response.body).not.toHaveProperty('passwordHash');
  });

  it('signup with an already used email returns 409', async () => {
    await api()
      .post('/auth/signup')
      .send({ email: 'dup@example.com', password })
      .expect(201);

    await api()
      .post('/auth/signup')
      .send({ email: 'dup@example.com', password })
      .expect(409);
  });

  it('login with a wrong password returns 401', async () => {
    await api()
      .post('/auth/signup')
      .send({ email: 'wrong@example.com', password })
      .expect(201);

    await api()
      .post('/auth/login')
      .send({ email: 'wrong@example.com', password: 'not the password' })
      .expect(401);
  });

  it('listing expenses without a token returns 401', async () => {
    await api().get('/expenses').expect(401);
  });

  it('listing expenses with a garbage token returns 401', async () => {
    await api()
      .get('/expenses')
      .set('Authorization', 'Bearer not-a-real-token')
      .expect(401);
  });

  it('creates an expense and then lists it', async () => {
    const headers = await signupAndLogin('create@example.com');

    const created = await api()
      .post('/expenses')
      .set(headers)
      .send(expenseInput)
      .expect(201);
    expect(created.body).toMatchObject(expenseInput);

    const list = await api().get('/expenses').set(headers).expect(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].id).toBe(created.body.id);
  });

  it('deletes an expense so it can no longer be found', async () => {
    const headers = await signupAndLogin('delete@example.com');
    const created = await api()
      .post('/expenses')
      .set(headers)
      .send(expenseInput)
      .expect(201);
    const url = `/expenses/${created.body.id as string}`;

    await api().delete(url).set(headers).expect(204);
    await api().get(url).set(headers).expect(404);
  });

  it("does not let one user read another user's expense", async () => {
    const owner = await signupAndLogin('owner@example.com');
    const stranger = await signupAndLogin('stranger@example.com');
    const created = await api()
      .post('/expenses')
      .set(owner)
      .send(expenseInput)
      .expect(201);

    await api()
      .get(`/expenses/${created.body.id as string}`)
      .set(stranger)
      .expect(404);
  });

  it("does not let one user delete another user's expense", async () => {
    const owner = await signupAndLogin('owner2@example.com');
    const stranger = await signupAndLogin('stranger2@example.com');
    const created = await api()
      .post('/expenses')
      .set(owner)
      .send(expenseInput)
      .expect(201);
    const url = `/expenses/${created.body.id as string}`;

    // คนแปลกหน้าลบไม่ได้ (404) และรายการของเจ้าของต้องยังอยู่
    await api().delete(url).set(stranger).expect(404);
    await api().get(url).set(owner).expect(200);
  });

  it("does not show another user's expenses in the list", async () => {
    const owner = await signupAndLogin('owner3@example.com');
    const stranger = await signupAndLogin('stranger3@example.com');
    await api().post('/expenses').set(owner).send(expenseInput).expect(201);

    const list = await api().get('/expenses').set(stranger).expect(200);
    expect(list.body).toEqual([])
  });
});
