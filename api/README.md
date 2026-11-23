# Expense Tracker API

REST API สำหรับสมัครบัญชี ล็อกอินด้วย JWT และจัดการรายจ่ายส่วนตัว ใช้ NestJS 12, Prisma 7 และ PostgreSQL ในเครื่อง

## เริ่มใช้งาน

ใช้ Node.js 24, pnpm 12 และ PostgreSQL ที่รันอยู่ที่ `127.0.0.1:5432`

```sh
pnpm install --frozen-lockfile
```

สร้างฐานสองฐานบน PostgreSQL ตัวเดียวกันด้วย role ที่จะใช้ใน `.env` ถ้าฐานมีอยู่แล้วให้ข้ามคำสั่งของฐานนั้น

```sql
CREATE DATABASE expense_tracker;
CREATE DATABASE expense_tracker_test;
```

สร้าง `.env` จาก `.env.example` แล้วใส่ชื่อผู้ใช้และรหัสผ่านของ PostgreSQL ใน `DATABASE_URL` กับ `TEST_DATABASE_URL` โดยใช้ชื่อฐานตามตัวอย่าง ใช้ `openssl rand -base64 32` สร้างค่า `JWT_SECRET` หากรหัสผ่านมีอักขระพิเศษ เช่น `@` หรือ `#` ให้ percent-encode ก่อนใส่ใน URL

```sh
pnpm exec prisma migrate dev
pnpm db:generate
pnpm start:dev
```

`migrate dev` ใช้ `DATABASE_URL` และต้องใช้ role ที่สร้าง shadow database ชั่วคราวได้ แอปฟังที่ `http://localhost:3000` ตามค่าเริ่มต้น

## เรียก API

```sh
curl -i http://localhost:3000/auth/signup \
  --json '{"email":"ada@example.com","password":"example-password"}'

curl -i http://localhost:3000/auth/login \
  --json '{"email":"ada@example.com","password":"example-password"}'

EXPENSE_ACCESS_TOKEN='paste_access_token_here'
curl -i http://localhost:3000/expenses \
  -H "Authorization: Bearer $EXPENSE_ACCESS_TOKEN" \
  --json '{"title":"Lunch","amount":"125.50","spentOn":"2026-11-22"}'
```

ใช้ access token จาก `/auth/login` กับทุกเส้นทางรายจ่าย Token มีอายุ 15 นาที จำนวนเงินใช้สกุลบาทและส่งเป็น string ทศนิยมสองหลัก วันที่ส่งเป็น `YYYY-MM-DD`

| Method   | Path            | การใช้งาน                                         |
| -------- | --------------- | ------------------------------------------------ |
| `GET`    | `/expenses`     | ดูรายการจากวันที่ใหม่ไปเก่า รองรับ `limit` และ `offset` |
| `POST`   | `/expenses`     | เพิ่มรายจ่าย                                        |
| `GET`    | `/expenses/:id` | ดูรายละเอียด                                       |
| `PATCH`  | `/expenses/:id` | แก้เฉพาะฟิลด์ที่ส่ง ใช้ `note: null` เพื่อล้างหมายเหตุ      |
| `DELETE` | `/expenses/:id` | ลบรายจ่าย                                         |

## ทดสอบ

```sh
pnpm test
pnpm test:e2e
pnpm lint
pnpm build
```

`pnpm test` รัน unit test ของ `ArgonService`, `envSchema`, `UserService`, `JwtAuthGuard`, `CurrentUser`, `AuthService`, `ExpensesService`, `ExpensesRepository` และตารางค่าขอบของ schema จำนวนเงิน วันที่ และ query

`pnpm test:e2e` ใช้ `TEST_DATABASE_URL` ซึ่งต้องชี้ไปที่ `expense_tracker_test` และรัน migrations ก่อนทดสอบ HTTP กับ PostgreSQL จริง

รหัสผ่านในฐานข้อมูลเก็บเป็น argon2id (`$argon2id$...`) บัญชีที่สร้างไว้ก่อนรุ่นนี้ยังเก็บ hash แบบ scrypt จึงล็อกอินไม่ได้ ให้ลบแถวของบัญชีนั้นในตาราง `User` แล้วสมัครใหม่ หรือสมัครด้วยอีเมลใหม่ เพราะอีเมลเดิมยังติด unique constraint
