# Expense Tracker Web

## เป้าหมาย

สร้างเว็บ expense tracker ใน `web/` (Next.js 16 App Router, React 19, Tailwind v4, TypeScript) ที่ต่อกับ API NestJS ใน `api/` ซึ่งมีอยู่แล้ว ตัวเว็บเป็น **สื่อการสอนการเขียน unit test ด้วย Vitest** สำหรับมือใหม่: โค้ดสั้น อ่านจบได้เร็ว และมีตัวอย่างเทส 3 ระดับ คือ ฟังก์ชันบริสุทธิ์, คอมโพเนนต์ที่รับ props, และคอมโพเนนต์ที่มีฟอร์ม

ความสำเร็จคือ: คนที่เปิด repo มาอ่านเห็นว่า "ส่วนไหนควรมีเทส ส่วนไหนไม่ต้องมี" และคัดลอกแพตเทิร์นไปใช้กับงานตัวเองได้

## ผู้ใช้

เจ้าของบัญชีรายจ่ายหนึ่งคน ใช้งานบนเบราว์เซอร์เดสก์ท็อป ภาษาไทย สมัครบัญชี เข้าสู่ระบบ แล้วเพิ่ม/แก้/ลบรายจ่ายของเดือนที่กำลังดูอยู่

## ขอบเขต

**ทำ**

- หน้า signup, login, logout (ใช้ JWT Bearer ของ API ใน httpOnly cookie)
- หน้ารายจ่าย: รายการของเดือนที่เลือก (ค่าเริ่มต้นคือเดือนปัจจุบัน), ยอดรวมของเดือน, เพิ่ม, แก้, ลบ
- ฟังก์ชันบริสุทธิ์สำหรับจัดรูปแบบจำนวนเงิน/วันที่แบบไทย, กรองตามเดือน, รวมยอด
- Vitest + jsdom + React Testing Library พร้อมเทส 5 ไฟล์แบบตารางเคส

**ไม่ทำ (non-goals)**

- หมวดหมู่รายจ่าย เพราะ `Expense` ของ API มีแค่ `title`, `amount`, `spentOn`, `note`
- UI แบ่งหน้า (pagination) ใช้ `limit=100` ค่าเดียวแล้วกรองฝั่ง client
- ค้นหา, กราฟ, export CSV, หลายสกุลเงิน, หลายบัญชีพร้อมกัน
- เทส route handler, hook ที่คุย network, และ e2e (กลยุทธ์อยู่ในหัวข้อการทดสอบ)
- เปลี่ยนโค้ดฝั่ง `api/` แม้แต่บรรทัดเดียว — ฝั่งเว็บคุยผ่าน route handler ของตัวเอง จึงไม่ต้องเปิด CORS

**anti-goals** (ถ้าออกมาแบบนี้ถือว่าผิดโจทย์)

- เทสที่ต้อง mock `fetch`/MSW หรือต้องมี server จริงถึงจะรันได้
- คอมโพเนนต์ที่ดึงข้อมูลเองข้างในจนเทสด้วย props ไม่ได้
- abstraction อย่าง repository/provider/context ที่ทำให้ตาม flow ยากขึ้นโดยไม่ได้แก้ปัญหาจริง

## แนวทางที่พิจารณา

| แนวทาง                                             | ข้อแลกเปลี่ยน                                                                                                                                       |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **client components + route handler เป็น proxy (เลือก)** | UI ที่โต้ตอบเป็น `"use client"` ทั้งหมด เรียก `/api/*` ของตัวเอง route handler แนบ Bearer token ให้ เทสง่ายสุดเพราะคอมโพเนนต์รับ props ล้วน ไม่ต้องรู้จัก Next เลย แลกกับ route handler 5 ไฟล์ที่เป็นท่อบาง ๆ |
| Server Components + Server Actions                 | JS ฝั่ง client น้อยกว่า แต่เทสต้อง mock `cookies()`, `next/cache`, action ที่เป็น async → มือใหม่สับสนว่าเทสอะไร และคอมโพเนนต์กลายเป็น async                        |
| เรียก NestJS ตรงจากเบราว์เซอร์                        | ไฟล์น้อยสุด แต่ต้องเปิด CORS ใน `api/src/main.ts` และ token ต้องอยู่ใน JS (localStorage) เสี่ยง XSS และเสีย same-origin cookie                                  |

เลือกแนวทางแรกตามที่ผู้ใช้ยืนยัน

## สถาปัตยกรรม

```
เบราว์เซอร์ ──fetch('/api/expenses')──▶ Next route handler ──Bearer token──▶ NestJS :3000 ──▶ PostgreSQL
                    ▲                        │
             httpOnly cookie ◀───────────────┘ (login/signup เท่านั้นที่เซ็ต cookie)
```

- API รันที่ `http://127.0.0.1:3000` (ค่า `PORT` เดิมของ `api/src/main.ts`) เว็บรันที่ **3001** เพื่อไม่ชนพอร์ต (`next dev -p 3001`)
- ตัวแปร env ใหม่: `API_URL` (ค่าเริ่มต้น `http://127.0.0.1:3000`) — เก็บใน `web/.env.local` ซึ่งถูก gitignore อยู่แล้ว ไม่ต้องสร้างไฟล์ใหม่ให้ tracked
- cookie ชื่อ `access_token` แนบ `httpOnly`, `sameSite: 'lax'`, `path: '/'`, `maxAge` เท่ากับ `expiresIn` ที่ API ส่งมา (900 วินาที), `secure` เมื่อ production
- ไม่มี middleware: หน้า `/` และ `/expenses` เป็น server component ที่อ่าน cookie แล้ว `redirect()` เอง เพื่อให้เห็น logic ในไฟล์เดียว
- 401 จาก API = token หมดอายุ → route handler ลบ cookie แล้วส่ง 401 ต่อ, hook ฝั่ง client พาไป `/login`

### ปรับ `next.config.ts` (เป็นการตัดสินใจของผู้เขียนเอกสาร)

สแกฟโฟลด์เปิด `cacheComponents: true` + `partialPrefetching: true` ไว้ แต่ตามเอกสารที่ติดมากับ Next 16.4.6 การเรียก `cookies()` **นอก** `<Suspense>` จะทำให้ route นั้น prerender ไม่ได้ และ `next build` ล้มเหลว (`partialPrefetching` เองก็บังคับต้องมี `cacheComponents`) ทางเลือกคือ (ก) เพิ่ม async component ย่อย + `<Suspense>` ในทุกหน้าที่อ่าน cookie หรือ (ข) ปิดสอง flag นี้

เลือก (ข): ตั้ง `cacheComponents: false` และลบ `partialPrefetching` ออกจาก `web/next.config.ts` เพราะโจทย์คืออ่านง่าย — guard ที่อยู่ในไฟล์เดียวอ่านรู้เรื่องกว่า และ repo นี้ไม่ได้ใช้ประโยชน์จาก PPR/`use cache` เลย ถ้าภายหลังอยากเปิดคืน ต้องย้ายการอ่าน cookie ไปอยู่ใน `<Suspense>` boundary

## สัญญา HTTP ภายใน (`/api/*`)

ทุกเส้นรับ/ส่ง JSON และส่งต่อ body กับ status จาก NestJS ตามเดิม (error ของ NestJS มีรูป `{ message, error, statusCode }`)

| Method | Path                  | รับ                                  | สำเร็จ                                            |
| ------ | --------------------- | ------------------------------------ | ------------------------------------------------ |
| `POST` | `/api/auth/signup`    | `{ email, password }`                 | `201 { ok: true }` + cookie (สมัครแล้วล็อกอินให้เลย) |
| `POST` | `/api/auth/login`     | `{ email, password }`                 | `200 { ok: true }` + cookie                       |
| `POST` | `/api/auth/logout`    | –                                    | `204` + ลบ cookie                                |
| `GET`  | `/api/expenses`       | –                                    | `200` อาร์เรย์รายจ่าย (ส่ง `limit=100`)             |
| `POST` | `/api/expenses`       | `{ title, amount, spentOn, note? }`   | `201` รายจ่ายที่สร้าง                              |
| `PATCH`| `/api/expenses/:id`   | ฟิลด์ใดก็ได้อย่างน้อย 1 ฟิลด์          | `200` รายจ่ายหลังแก้ไข                             |
| `DELETE`| `/api/expenses/:id`  | –                                    | `204`                                            |

- `/api/auth/signup` เรียก NestJS signup ก่อน ถ้าสำเร็จจึงเรียก login ต่อเพื่อขอ token ในคำขอเดียว (client เห็นผลลัพธ์เดียว)
- `GET /api/expenses` เติม `limit=100` ให้เอง ไม่รับ `offset` จาก client
- route handler ห้ามกลืน error: ส่ง status และ body ของ NestJS กลับไปตรง ๆ เพื่อให้ UI แสดงข้อความไทยที่เรากำหนดตาม status (400, 401, 404, 409)

## โครงไฟล์

```
web/
├── vitest.config.ts
├── next.config.ts                         ปิด cacheComponents + partialPrefetching (ดูด้านบน)
├── package.json                           เพิ่มสคริปต์ test / test:watch / dev -p 3001
├── src/
│   ├── app/
│   │   ├── layout.tsx                     แก้ metadata + lang="th"
│   │   ├── page.tsx                       server: cookie? /expenses : /login
│   │   ├── login/page.tsx                 client: ฟอร์มล็อกอิน (ไม่เขียนเทส)
│   │   ├── signup/page.tsx                client: ฟอร์มสมัคร (ไม่เขียนเทส)
│   │   ├── expenses/page.tsx              server: guard cookie → <ExpensesScreen/>
│   │   └── api/
│   │       ├── auth/login/route.ts
│   │       ├── auth/signup/route.ts
│   │       ├── auth/logout/route.ts
│   │       ├── expenses/route.ts          GET, POST
│   │       └── expenses/[id]/route.ts     PATCH, DELETE
│   ├── components/
│   │   ├── ExpenseRow.tsx                 ★ มีเทส
│   │   ├── ExpenseList.tsx                ★ มีเทส
│   │   ├── ExpenseForm.tsx                ★ มีเทส
│   │   ├── SummaryBar.tsx                 ไม่มีเทส (แสดงผลล้วน ๆ)
│   │   └── ExpensesScreen.tsx             client container: state + เรียก hook
│   ├── lib/
│   │   ├── types.ts                       Expense, ExpenseInput
│   │   ├── format.ts                      ★ formatAmount, formatThaiDate
│   │   ├── expenses.ts                    ★ monthKey, filterByMonth, toCents, sumCents
│   │   ├── api-client.ts                  fetch wrapper ฝั่ง browser
│   │   ├── use-expenses.ts                hook: load/create/update/remove
│   │   └── backend.ts                     helper ฝั่ง server: API_URL + Bearer
│   └── test/setup.ts                      jest-dom + cleanup
└── src/**/*.test.{ts,tsx}                 อยู่ข้างไฟล์ที่ถูกเทส
```

★ = ไฟล์ที่มีเทส ใช้ relative import ทั้งโปรเจกต์ (`../lib/format`) ไม่ตั้ง alias `@/` เพื่อไม่ต้องตั้ง `resolve.alias` ใน Vitest

ภาษา: ชื่อไฟล์ ตัวแปร ฟังก์ชัน ชื่อเทส และข้อความ commit เป็นอังกฤษ; คอมเมนต์อธิบาย "ทำไมไฟล์นี้ไม่มีเทส / ทำไมเก็บเงินเป็นสตางค์" และ `README.md` เป็นไทย เพราะผู้อ่านคือมือใหม่ไทย และเอกสารของ repo นี้ (`api/docs/superpowers/specs`) เขียนไทยอยู่แล้ว

## หน้าจอ

**`/login`** — การ์ดกลางจอ

```
┌────────────────────────────┐
│  บันทึกรายจ่าย              │
│  อีเมล    [___________]     │
│  รหัสผ่าน [___________]     │
│  [ เข้าสู่ระบบ ]            │
│  ยังไม่มีบัญชี? สมัคร        │
└────────────────────────────┘
```

**`/signup`** — การ์ดเดียวกัน เปลี่ยนปุ่มเป็น "สมัครสมาชิก" และมีข้อความ "รหัสผ่านอย่างน้อย 12 ตัวอักษร"

**`/expenses`**

```
┌──────────────────────────────────────────────┐
│ รายจ่ายเดือนนี้        [2026-11]  [ออกจากระบบ]│
│ รวม 3 รายการ                        1,250.00 │
│ ──────────────────────────────────────────── │
│ ข้าวเที่ยง  22 พ.ย. 2569   125.50   ✏️  🗑    │
│ ค่าเดินทาง  21 พ.ย. 2569   300.00   ✏️  🗑    │
│ ──────────────────────────────────────────── │
│ [+ เพิ่มรายจ่าย]                              │
└──────────────────────────────────────────────┘
```

- ตัวกรองเดือนคือ `<input type="month">` (native ไม่ต้องลง lib) ค่าเริ่มต้น `YYYY-MM` ของวันนี้
- "เพิ่มรายจ่าย" เปิด `ExpenseForm` ในโหมดเพิ่ม, ปุ่ม ✏️ เปลี่ยนแถวบนสุดให้เป็น `ExpenseForm` โหมดแก้ (ส่ง `initial` เข้าไป) — ไม่ใช้ modal
- ไม่มีข้อมูลในเดือนนั้น → `ExpenseList` แสดง "ยังไม่มีรายจ่ายในเดือนนี้"
- ระหว่างโหลดแสดงข้อความ "กำลังโหลด…" และถ้าพลาดแสดงข้อความ error + ปุ่ม "ลองใหม่"

## คอมโพเนนต์และ props

```ts
// ExpenseRow — แถวเดียว ไม่มี state ไม่เรียก API
{ expense: Expense; onEdit: (expense: Expense) => void; onDelete: (id: string) => void }

// ExpenseList — วน row หรือแสดง empty state
{ expenses: Expense[]; onEdit: (e: Expense) => void; onDelete: (id: string) => void; emptyText: string }

// ExpenseForm — state ภายในเฉพาะค่าฟอร์ม + error ของฟิลด์
{
  initial?: Expense;                       // ไม่ส่ง = โหมดเพิ่ม
  onSubmit: (input: ExpenseInput) => void | Promise<void>;
  onCancel?: () => void;                   // มีเฉพาะโหมดแก้
}

// SummaryBar — แสดงผลล้วน
{ total: string; count: number }           // total ผ่าน formatAmount มาแล้ว
```

กติกาที่ทำให้เทสง่าย: คอมโพเนนต์ทั้งสี่ **ห้าม** `fetch`, `useRouter`, `useParams` หรืออ่าน `window` — เรียก callback เท่านั้น การเชื่อมกับ API อยู่ใน `use-expenses.ts` และ `ExpensesScreen.tsx` ที่เดียว

ปุ่มใน `ExpenseRow` มี `aria-label` ภาษาไทย ("แก้ไข ข้าวเที่ยง") เพื่อให้ query ในเทสอ่านง่ายและตรงกับสิ่งที่ผู้ใช้ screen reader ได้ยิน

## ฟังก์ชันบริสุทธิ์

```ts
// lib/format.ts
formatAmount(cents: number): string      // 12550 → "125.50", 125000 → "1,250.00"
formatThaiDate(spentOn: string): string  // "2026-11-22" → "22 พ.ย. 2569" (พ.ศ. + 543)

// lib/expenses.ts
monthKey(spentOn: string): string                 // "2026-11-22" → "2026-11"
filterByMonth(list: Expense[], month: string): Expense[]
toCents(amount: string): number                   // "125.50" → 12550
sumCents(list: Expense[]): number
```

เหตุผลที่เก็บเงินเป็นจำนวนเต็ม "สตางค์": `0.1 + 0.2` ให้ `0.30000000000000004` — เป็นบทเรียนลัดที่พิสูจน์ด้วยเทสได้ในบรรทัดเดียว `formatAmount` ใช้ `Intl.NumberFormat('th-TH')` เฉพาะส่วนคั่นหลักพัน (ไม่ใส่สัญลักษณ์สกุลเงิน เพื่อให้ผลลัพธ์คงที่และเทสง่าย)

วัน Thai ใช้ mapping เดือน 12 ชื่อในไฟล์ ไม่ใช้ `Intl` เพราะปฏิทินพุทธของ ICU ต่างกันตาม runtime — test ต้อง deterministic

`spentOn` เป็น string `YYYY-MM-DD` อยู่แล้ว จึงไม่ต้องผ่าน `Date` เลย (ไม่เกิด timezone bug)

## การจัดการ error

| สถานการณ์                        | ที่จัดการ                                    | ผู้ใช้เห็น                                  |
| -------------------------------- | -------------------------------------------- | ----------------------------------------- |
| ฟอร์มไม่ครบ / amount ผิดรูปแบบ     | `ExpenseForm`                                 | ข้อความใต้ช่องนั้น                          |
| API ตอบ 400                        | `ExpensesScreen`                              | "ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง"          |
| อีเมลซ้ำ (409)                     | `/signup`                                     | "อีเมลนี้ถูกใช้แล้ว"                          |
| อีเมล/รหัสผ่านผิด (401 ที่ login)    | `/login`                                      | "อีเมลหรือรหัสผ่านไม่ถูกต้อง"                   |
| token หมดอายุ (401 ที่ `/api/expenses`) | route handler ลบ cookie, hook พาไป `/login`      | กลับไปหน้า login                            |
| 404 ตอนแก้/ลบ (ถูกลบจากที่อื่น)       | `ExpensesScreen`                              | "ไม่พบรายจ่ายนี้" + reload                   |

## การทดสอบ

เครื่องมือ: `vitest`, `@vitejs/plugin-react`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`

`vitest.config.ts`: `plugins: [react()]`, `test.environment: 'jsdom'`, `test.setupFiles: ['./src/test/setup.ts']` ไม่เปิด `globals` — ทุกเทส `import { describe, it, expect } from 'vitest'` ให้มือใหม่เห็นที่มาของฟังก์ชัน

`src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(cleanup)
```

(ต้อง cleanup เองเพราะไม่ได้เปิด `globals`)

| ไฟล์                        | สิ่งที่ตรวจ                                                                                              | แพตเทิร์น                                                        |
| --------------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| `lib/format.test.ts`        | ศูนย์, ทศนิยม, หลักพัน, ค่าสูงสุด `9999999999.99`; วันที่ 1/2 หลัก, ชื่อเดือน, +543 ปี                        | `it.each` ตาราง input → expected                                 |
| `lib/expenses.test.ts`      | กรองเดือนถูก/ไม่ถูก/ไม่เหลือ; `toCents`; `sumCents` ของลิสต์ว่าง = 0; `0.10 + 0.20 = 0.30` ไม่เพี้ยน           | `it.each` + เคสเดียวที่เล่าเรื่อง float                            |
| `ExpenseRow.test.tsx`       | แสดงชื่อ/จำนวน/วันที่/หมายเหตุ; note เป็น null ไม่แสดง; กดแก้ → callback ได้ `expense`; กดลบ → ได้ `id`        | `render` + `screen` + `userEvent`                                 |
| `ExpenseList.test.tsx`      | 2 รายการ → 2 row; ลิสต์ว่าง → แสดง empty text; ไม่ส่ง error                            | prop-driven, ไม่มี mock                                            |
| `ExpenseForm.test.tsx`      | กรอกครบ → `onSubmit` ได้ค่าตามที่กรอก (amount ทศนิยม 2 ตำแหน่ง); amount ผิด → error ขึ้นและ `onSubmit` ไม่ถูกเรียก; โหมดแก้ → field prefill | `userEvent.type` + `vi.fn()`                                       |

รายละเอียดที่ต้องคงไว้เพื่อให้มือใหม่เข้าใจ

- ใช้ `screen.getByRole('button', { name: 'ลบ ข้าวเที่ยง' })` ไม่ใช้ `container.querySelector`
- ใช้ `await userEvent.click(...)` เพราะ user-event v14 เป็น async
- ตรวจ callback ด้วย `expect(onDelete).toHaveBeenCalledWith('id-1')`
- ทุกไฟล์มี `describe` เดียวชื่อเดียวกับสิ่งที่เทส ไม่ซ้อนกันหลายชั้น

## ตัวอย่างเทสที่ตั้งใจให้ออกมา

```ts
// lib/expenses.test.ts
import { describe, expect, it } from 'vitest'
import { filterByMonth, sumCents } from './expenses'
import type { Expense } from './types'

const expense = (spentOn: string, amount: string): Expense => ({
  id: spentOn, title: 'x', amount, spentOn, note: null,
  createdAt: '', updatedAt: '',
})

describe('filterByMonth', () => {
  it.each([
    ['2026-11', 2],
    ['2026-10', 1],
    ['2025-01', 0],
  ])('keeps only expenses in %s', (month, expected) => {
    const list = [expense('2026-11-01', '1.00'), expense('2026-11-30', '2.00'), expense('2026-10-15', '3.00')]
    expect(filterByMonth(list, month)).toHaveLength(expected)
  })
})

describe('sumCents', () => {
  it('adds cents without floating point drift', () => {
    expect(sumCents([expense('2026-11-01', '0.10'), expense('2026-11-02', '0.20')])).toBe(30)
  })

  it('returns 0 for an empty list', () => {
    expect(sumCents([])).toBe(0)
  })
})
```

## เกณฑ์เสร็จ

1. `pnpm test` เขียวทั้ง 5 ไฟล์ (และเพิ่มได้ถ้าจำเป็น แต่ต้องสั้นเท่าเดิม)
2. `pnpm build` ผ่าน
3. `pnpm lint` ผ่าน
4. `README.md` อัปเดตวิธีรัน API + เว็บ + เทส
5. (ถ้าอนุมัติ) smoke test จริง: `prisma migrate deploy` → `pnpm start:dev` (API :3000) → `pnpm dev` (เว็บ :3001) → สมัคร → เพิ่ม → แก้ → ลบ → logout

การไล่ flow จริงกับ API + PostgreSQL ทำได้บนเครื่องนี้: PostgreSQL 18.6 รันอยู่ที่ `127.0.0.1:5432` และ `api/.env` เชื่อมได้ (ตรวจแล้ว 2026-11-24)

- ฐาน `expense_tracker` มีอยู่แต่ยังไม่ apply migration → ต้องรัน `pnpm exec prisma migrate deploy` หนึ่งครั้งก่อนใช้งาน (สร้างตารางตาม `prisma/migrations/20261122000000_init`) ไม่ลบข้อมูลเดิม
- ฐาน `expense_tracker_test` มีตารางครบแล้ว e2e ของ API จึงไม่กระทบ
- ยังไม่มีผู้ใช้ในฐาน dev → สมัครผ่านหน้า `/signup` ของเว็บได้เลย หรือจะ seed ก็ได้

## คำสั่งที่ต้องใช้

```bash
cd web
pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom
pnpm test          # vitest run
pnpm test:watch    # vitest
pnpm dev           # next dev -p 3001
pnpm build         # ต้องผ่าน
```

## สิ่งที่เหลือให้ผู้ลงมือ

- กำหนดสี ระยะ และรายละเอียด Tailwind ให้อ่านง่าย (โทนกลาง ๆ พื้นขาว/เทา แบรนด์สีเดียว)
- ข้อความ error/empty state ที่เหลือ ปรับถ้อยคำได้ตามความเหมาะสม
- รายละเอียดของ `api-client.ts` / `use-expenses.ts` / `backend.ts` (ไม่ถูกเทส) ให้เขียนแบบตรงไปตรงมา: ฟังก์ชันเดียวต่อหนึ่ง endpoint, ไม่มี cache
- อัปเดต `web/README.md` ให้บอกวิธีรัน API + เว็บ + เทส
