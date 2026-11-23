# บันทึกรายจ่าย (web)

เว็บ expense tracker ภาษาไทยที่ต่อกับ API NestJS ใน `api/` ทำหน้าที่เป็น **ตัวอย่างการสอนการเขียน unit test ด้วย Vitest** — โค้ดสั้น อ่านจบเร็ว และมีเทสให้ดู 3 ระดับ คือ ฟังก์ชันบริสุทธิ์, คอมโพเนนต์ที่รับ props, และคอมโพเนนต์ที่มีฟอร์ม

## สิ่งที่ต้องมี

- Node.js 20.9 ขึ้นไป และ pnpm (Next.js 16 ต้องการ `>=20.9.0`)
- PostgreSQL รันอยู่ที่ `127.0.0.1:5432` (ดู `api/.env` สำหรับ `DATABASE_URL`)
- API ใน `api/` พร้อมใช้งาน

## วิธีรัน

เปิด API ก่อน (พอร์ต 3000)

```bash
cd api
pnpm install
pnpm exec prisma migrate deploy   # ครั้งแรกครั้งเดียว
pnpm start:dev
```

แล้วเปิดเว็บ (พอร์ต 3001)

```bash
cd web
pnpm install
pnpm dev
```

เปิด <http://localhost:3001> จะเจอหน้า `/login` ให้กด "สมัครสมาชิก" เพื่อสร้างบัญชีแรก (รหัสผ่านอย่างน้อย 12 ตัวอักษร)

## การตั้งค่า

| ค่า | ความหมาย |
| --- | --- |
| `API_URL` | ที่อยู่ของ API ฝั่งเซิร์ฟเวอร์ ค่าเริ่มต้น `http://127.0.0.1:3000` ตั้งใน `web/.env.local` ถ้าต้องการเปลี่ยน |
| cookie `access_token` | JWT ที่ route handler ของเว็บเก็บให้ เป็น `httpOnly` อายุ 15 นาที (ตามที่ API ออกให้) |

เบราว์เซอร์ไม่เคยเห็น token และไม่เคยเรียก API ตรง ๆ — เรียก `/api/*` ของเว็บ แล้ว route handler แนบ Bearer token ให้ จึงไม่ต้องเปิด CORS ที่ฝั่ง API

## ทำไมมีเทสแค่ 5 ไฟล์

โครงสร้างนี้ออกแบบให้ "สิ่งที่ควรเทส" กับ "สิ่งที่ต้อง mock" แยกจากกันชัด ๆ

**มีเทส** (_LOGIC อยู่ตรงนี้)

| ไฟล์ | สิ่งที่พิสูจน์ |
| --- | --- |
| `src/lib/format.test.ts` | จัดรูปแบบจำนวนเงินเป็นสตางค์ และวันที่แบบไทย (พ.ศ.) |
| `src/lib/expenses.test.ts` | กรองตามเดือน, แปลงจำนวนเงินเป็นสตางค์, รวมยอดโดยไม่เพี้ยนจากทศนิยม |
| `src/components/ExpenseRow.test.tsx` | แถวเดียวแสดงอะไร และกดปุ่มแล้วเรียก callback ถูกตัว |
| `src/components/ExpenseList.test.tsx` | แสดงกี่แถว และข้อความตอนไม่มีข้อมูล |
| `src/components/ExpenseForm.test.tsx` | ตรวจค่าฟอร์ม ตัดช่องว่าง และ prefill ตอนแก้ไข |

**ไม่เทส** (ท่อบาง ๆ ที่ไม่มีตรรกะของตัวเอง)

- `src/app/api/**/route.ts` — แค่ส่งต่อ request/response กับ API จริง
- `src/lib/use-expenses.ts` — state + เรียก API ถ้าอยากเทสส่วนนี้ต้อง mock `fetch` ซึ่งทำให้ตัวอย่างอ่านยากขึ้น
- `src/lib/api-client.ts` — ตัวเรียก `/api/*` บาง ๆ ถ้าจะเทสก็ต้อง mock `fetch`
- `src/components/ExpensesScreen.tsx` — ตัวประกอบ state ของหน้า (เดือน/ฟอร์มที่เปิดอยู่)
- `src/app/login/page.tsx`, `src/app/signup/page.tsx` — ฟอร์มเดียวกันในเชิงรูปทรงกับ `ExpenseForm` ที่มีเทสอยู่แล้ว
- `src/components/SummaryBar.tsx` — แสดงผลล้วน

หลักที่ใช้ตัดสิน: **ถ้าต้อง mock ถึงจะเทสได้ ให้ถามก่อนว่าย้ายตรรกะออกมาเป็นฟังก์ชันบริสุทธิ์ได้ไหม** — ถ้าย้ายได้ ให้ย้ายแล้วเทสฟังก์ชันนั้น ซึ่งคือที่มาของ `lib/expenses.ts`

## คำสั่ง

```bash
pnpm dev          # เว็บที่ http://localhost:3001
pnpm test         # รันเทสทั้งหมดครั้งเดียว
pnpm test:watch   # รันเทสแบบเฝ้าไฟล์
pnpm lint
pnpm build
```
