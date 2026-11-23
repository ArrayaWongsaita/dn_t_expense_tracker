# Expense Tracker Web Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** เว็บ expense tracker ภาษาไทยใน `web/` ที่ต่อกับ API NestJS ที่มีอยู่ และเป็นตัวอย่างการสอน unit test ด้วย Vitest สำหรับมือใหม่

**Architecture:** UI ที่โต้ตอบเป็น client component ทั้งหมด เรียก `/api/*` ของ Next เอง ซึ่งทำหน้าที่ proxy ไป NestJS พร้อมแนบ Bearer token จาก httpOnly cookie (ไม่ต้องเปิด CORS ที่ฝั่ง API) คอมโพเนนต์ที่แสดงผลรับ props ล้วนและมีเทส 5 ไฟล์ ตรรกะเงิน/วันที่แยกเป็นฟังก์ชันบริสุทธิ์ใน `lib/`

**Tech Stack:** Next.js 16.4.6 (App Router), React 19, TypeScript strict, Tailwind v4, Vitest, jsdom, React Testing Library, user-event

**Spec:** `web/docs/superpowers/specs/2026-11-24-expense-tracker-web-design.md`

## Global Constraints

- ห้ามแก้ไฟล์ใด ๆ ใต้ `api/` — ฝั่งเว็บคุยผ่าน route handler ของตัวเองเท่านั้น
- รันเว็บที่พอร์ต **3001** (`next dev -p 3001`) และถือว่า API อยู่ที่ `http://127.0.0.1:3000` (override ได้ด้วย env `API_URL`)
- **ห้าม commit หรือ push** จนกว่าผู้ใช้จะสั่ง — ทุก task จบที่การตรวจ (test/lint/build) ไม่ใช่ commit
- ใช้ relative import เท่านั้น (`../lib/format`) ห้ามตั้ง alias `@/` เพราะ Vitest จะ resolve ไม่ได้ถ้าไม่ตั้ง `resolve.alias`
- UI text เป็นภาษาไทย; ชื่อไฟล์ ตัวแปร ฟังก์ชัน และชื่อเทสเป็นอังกฤษ; คอมเมนต์อธิบายและ `README.md` เป็นภาษาไทย
- เงินเก็บเป็น **จำนวนเต็มสตางค์** (`toCents`) ห้ามบวกเลขทศนิยมตรง ๆ; `spentOn` เป็น string `YYYY-MM-DD` ห้ามแปลงผ่าน `Date`
- คอมโพเนนต์ใน `src/components/` ห้ามเรียก `fetch`, `useRouter`, `useParams` หรือแตะ `window` — รับ props/callback เท่านั้น
- `pnpm test`, `pnpm lint`, `pnpm build` ต้องผ่านก่อนถือว่างานจบ
- เพิ่ม dependency ได้เฉพาะชุด testing ที่ระบุใน Task 1 — ไม่เพิ่ม UI kit, date lib, form lib, state lib
- ปิด `cacheComponents` และ `partialPrefetching` ใน `next.config.ts` ตามที่ spec ระบุ (การเรียก `cookies()` นอก `<Suspense>` จะทำให้ build ล้มเมื่อ flag เปิด)

## Review Focus

- **จำนวนเงินที่ผู้ใช้พิมพ์เกิน/ขาดทศนิยม** (`125.5`, `125.555`, `0`) — ฟอร์มต้องไม่ส่งไป API เพราะ API รับเฉพาะ `^\d+\.\d{2}$` ที่มากกว่าศูนย์ → เทสใน Task 5
- **`note` ที่เป็นช่องว่างล้วน** — ต้องส่ง `null` ไม่ใช่ `"   "` ไม่งั้น API ตอบ 400 → เทสใน Task 5
- **วันสิ้นเดือน/ต้นเดือนที่อยู่คนละเดือนกัน** (`2026-10-31`, `2026-11-01`) — ต้องถูกกรองแยกเดือนถูกต้อง และไม่เพี้ยนเพราะ timezone → เทสใน Task 2
- **ยอดรวมที่เกิดจาก floating point** (`0.10 + 0.20`) — ต้องได้ `0.30` ไม่ใช่ `0.30000000000000004` → เทสใน Task 2
- **เดือนที่ไม่มีรายจ่ายเลย** — ต้องเห็น `0.00` และข้อความ "ยังไม่มีรายจ่ายในเดือนนี้" ไม่ใช่หน้าว่างหรือ error → เทสใน Task 4

---

### Task 1: Test tooling + ฟังก์ชันจัดรูปแบบ

**Files:**
- Modify: `web/package.json` (scripts + devDependencies)
- Create: `web/vitest.config.ts`
- Create: `web/src/test/setup.ts`
- Create: `web/src/lib/format.ts`
- Test: `web/src/lib/format.test.ts`

**Interfaces:**
- Consumes: ไม่มี
- Produces:
  - `formatAmount(cents: number): string` — `12550` → `"125.50"`, `125000` → `"1,250.00"`
  - `formatThaiDate(spentOn: string): string` — `"2026-11-22"` → `"22 พ.ย. 2569"`

- [x] **Step 1: ติดตั้ง dependency และเพิ่มสคริปต์**

```bash
cd web
pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom
```

ใน `package.json` ตั้ง scripts เป็น:

```json
"dev": "next dev -p 3001",
"build": "next build",
"start": "next start -p 3001",
"lint": "eslint",
"test": "vitest run",
"test:watch": "vitest"
```

- [x] **Step 2: สร้าง config และ setup file**

`vitest.config.ts`

```ts
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
```

`src/test/setup.ts` (ไม่เปิด `globals` จึงต้องเรียก `cleanup` เอง)

```ts
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(cleanup)
```

- [x] **Step 3: เขียนเทสที่ยังไม่ผ่าน**

`src/lib/format.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import { formatAmount, formatThaiDate } from './format'

describe('formatAmount', () => {
  it.each([
    [0, '0.00'],
    [5, '0.05'],
    [12550, '125.50'],
    [125000, '1,250.00'],
    [999999999999, '9,999,999,999.99'],
  ])('formats %i cents as %s', (cents, expected) => {
    expect(formatAmount(cents)).toBe(expected)
  })
})

describe('formatThaiDate', () => {
  it.each([
    ['2026-11-22', '22 พ.ย. 2569'],
    ['2026-01-05', '5 ม.ค. 2569'],
    ['2000-12-31', '31 ธ.ค. 2543'],
  ])('formats %s as %s', (spentOn, expected) => {
    expect(formatThaiDate(spentOn)).toBe(expected)
  })
})
```

- [x] **Step 4: รันเทสให้เห็นว่าไม่ผ่าน**

Run: `pnpm exec vitest run src/lib/format.test.ts`
Expected: FAIL — `Failed to resolve import "./format"`

- [x] **Step 5: เขียน `src/lib/format.ts`**

```ts
const THAI_MONTHS = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
]

export function formatAmount(cents: number): string {
  return (cents / 100).toLocaleString('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function formatThaiDate(spentOn: string): string {
  const [year, month, day] = spentOn.split('-').map(Number)
  return `${day} ${THAI_MONTHS[month - 1]} ${year + 543}`
}
```

`toLocaleString` ใช้เฉพาะตัวคั่นหลักพัน (ไม่ใส่ `฿`) เพื่อให้ผลลัพธ์คงที่; Thai date ใช้ array เดือนแทน `Intl` เพราะปฏิทินพุทธของ ICU ต่างกันตาม runtime ทำให้เทสไม่ deterministic

- [x] **Step 6: รันเทสให้ผ่าน**

Run: `pnpm test`
Expected: PASS 8 tests

---

### Task 2: ชนิดข้อมูล + ตรรกะรายจ่าย

**Files:**
- Create: `web/src/lib/types.ts`
- Create: `web/src/lib/expenses.ts`
- Test: `web/src/lib/expenses.test.ts`

**Interfaces:**
- Consumes: ไม่มี
- Produces:
  - `Expense` = `{ id: string; title: string; amount: string; spentOn: string; note: string | null; createdAt: string; updatedAt: string }`
  - `ExpenseInput` = `{ title: string; amount: string; spentOn: string; note: string | null }`
  - `monthKey(spentOn: string): string`
  - `filterByMonth(expenses: Expense[], month: string): Expense[]`
  - `toCents(amount: string): number`
  - `sumCents(expenses: Expense[]): number`

- [x] **Step 1: เขียนเทสที่ยังไม่ผ่าน**

`src/lib/expenses.test.ts` — helper `makeExpense` สร้าง `Expense` จาก `spentOn` กับ `amount` เท่านั้น

```ts
import { describe, expect, it } from 'vitest'
import { filterByMonth, monthKey, sumCents, toCents } from './expenses'
import type { Expense } from './types'

function makeExpense(spentOn: string, amount: string): Expense {
  return {
    id: `${spentOn}-${amount}`,
    title: 'x',
    amount,
    spentOn,
    note: null,
    createdAt: '2026-11-24T00:00:00.000Z',
    updatedAt: '2026-11-24T00:00:00.000Z',
  }
}

describe('monthKey', () => {
  it.each([
    ['2026-11-22', '2026-11'],
    ['2026-01-01', '2026-01'],
  ])('takes the month out of %s', (spentOn, expected) => {
    expect(monthKey(spentOn)).toBe(expected)
  })
})

describe('filterByMonth', () => {
  const list = [
    makeExpense('2026-10-31', '1.00'),
    makeExpense('2026-11-01', '2.00'),
    makeExpense('2026-11-30', '3.00'),
  ]

  it.each([
    ['2026-11', 2],
    ['2026-10', 1],
    ['2025-01', 0],
  ])('keeps only expenses in %s', (month, expected) => {
    expect(filterByMonth(list, month)).toHaveLength(expected)
  })
})

describe('toCents', () => {
  it.each([
    ['0.05', 5],
    ['125.50', 12550],
    ['9999999999.99', 999999999999],
  ])('turns %s into %i cents', (amount, expected) => {
    expect(toCents(amount)).toBe(expected)
  })
})

describe('sumCents', () => {
  it('adds cents without floating point drift', () => {
    const list = [makeExpense('2026-11-01', '0.10'), makeExpense('2026-11-02', '0.20')]
    expect(sumCents(list)).toBe(30)
  })

  it('returns 0 for an empty list', () => {
    expect(sumCents([])).toBe(0)
  })
})
```

- [x] **Step 2: รันเทสให้เห็นว่าไม่ผ่าน**

Run: `pnpm exec vitest run src/lib/expenses.test.ts`
Expected: FAIL — `Failed to resolve import "./expenses"`

- [x] **Step 3: เขียน `src/lib/types.ts`**

```ts
export interface Expense {
  id: string
  title: string
  amount: string
  spentOn: string
  note: string | null
  createdAt: string
  updatedAt: string
}

export interface ExpenseInput {
  title: string
  amount: string
  spentOn: string
  note: string | null
}
```

- [x] **Step 4: เขียน `src/lib/expenses.ts`**

```ts
import type { Expense } from './types'

export function monthKey(spentOn: string): string {
  return spentOn.slice(0, 7)
}

export function filterByMonth(expenses: Expense[], month: string): Expense[] {
  return expenses.filter((expense) => monthKey(expense.spentOn) === month)
}

export function toCents(amount: string): number {
  return Math.round(Number(amount) * 100)
}

export function sumCents(expenses: Expense[]): number {
  return expenses.reduce((total, expense) => total + toCents(expense.amount), 0)
}
```

ยังไม่ต้องมี type guard หรือจัดการ `amount` ที่ผิดรูปแบบ — ฟอร์มกันไว้แล้ว (Task 5)

- [x] **Step 5: รันเทสให้ผ่าน**

Run: `pnpm test`
Expected: PASS ทุกไฟล์ (18 tests)

---

### Task 3: `ExpenseRow`

**Files:**
- Create: `web/src/components/ExpenseRow.tsx`
- Test: `web/src/components/ExpenseRow.test.tsx`

**Interfaces:**
- Consumes: `Expense` (Task 2), `formatAmount`/`formatThaiDate` (Task 1), `toCents` (Task 2)
- Produces: `ExpenseRow({ expense: Expense; onEdit: (expense: Expense) => void; onDelete: (id: string) => void })`
  - ปุ่มมี `aria-label` = `` `แก้ไข ${expense.title}` `` และ `` `ลบ ${expense.title}` ``

- [x] **Step 1: เขียนเทสที่ยังไม่ผ่าน**

`src/components/ExpenseRow.test.tsx`

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ExpenseRow } from './ExpenseRow'
import type { Expense } from '../lib/types'

const expense: Expense = {
  id: 'exp-1',
  title: 'ข้าวเที่ยง',
  amount: '125.50',
  spentOn: '2026-11-22',
  note: null,
  createdAt: '2026-11-24T00:00:00.000Z',
  updatedAt: '2026-11-24T00:00:00.000Z',
}

describe('ExpenseRow', () => {
  it('shows the title, amount and date', () => {
    render(<ExpenseRow expense={expense} onEdit={vi.fn()} onDelete={vi.fn()} />)

    expect(screen.getByText('ข้าวเที่ยง')).toBeInTheDocument()
    expect(screen.getByText('125.50')).toBeInTheDocument()
    expect(screen.getByText('22 พ.ย. 2569')).toBeInTheDocument()
  })

  it('shows the note only when there is one', () => {
    const { rerender } = render(
      <ExpenseRow expense={expense} onEdit={vi.fn()} onDelete={vi.fn()} />,
    )
    expect(screen.queryByText('กับข้าว')).not.toBeInTheDocument()

    rerender(
      <ExpenseRow expense={{ ...expense, note: 'กับข้าว' }} onEdit={vi.fn()} onDelete={vi.fn()} />,
    )
    expect(screen.getByText('กับข้าว')).toBeInTheDocument()
  })

  it('calls onEdit with the expense', async () => {
    const onEdit = vi.fn()
    render(<ExpenseRow expense={expense} onEdit={onEdit} onDelete={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: 'แก้ไข ข้าวเที่ยง' }))

    expect(onEdit).toHaveBeenCalledWith(expense)
  })

  it('calls onDelete with the expense id', async () => {
    const onDelete = vi.fn()
    render(<ExpenseRow expense={expense} onEdit={vi.fn()} onDelete={onDelete} />)

    await userEvent.click(screen.getByRole('button', { name: 'ลบ ข้าวเที่ยง' }))

    expect(onDelete).toHaveBeenCalledWith('exp-1')
  })
})
```

- [x] **Step 2: รันเทสให้เห็นว่าไม่ผ่าน**

Run: `pnpm exec vitest run src/components/ExpenseRow.test.tsx`
Expected: FAIL — `Failed to resolve import "./ExpenseRow"`

- [x] **Step 3: เขียน `src/components/ExpenseRow.tsx`**

```tsx
import { formatAmount, formatThaiDate } from '../lib/format'
import { toCents } from '../lib/expenses'
import type { Expense } from '../lib/types'

interface ExpenseRowProps {
  expense: Expense
  onEdit: (expense: Expense) => void
  onDelete: (id: string) => void
}

export function ExpenseRow({ expense, onEdit, onDelete }: ExpenseRowProps) {
  return (
    <li className="flex items-center justify-between gap-4 border-b border-neutral-200 py-3">
      <div className="min-w-0">
        <p className="truncate font-medium">{expense.title}</p>
        <p className="text-sm text-neutral-500">{formatThaiDate(expense.spentOn)}</p>
        {expense.note ? <p className="truncate text-sm text-neutral-500">{expense.note}</p> : null}
      </div>
      <span className="font-mono tabular-nums">{formatAmount(toCents(expense.amount))}</span>
      <div className="flex gap-2">
        <button
          type="button"
          aria-label={`แก้ไข ${expense.title}`}
          onClick={() => onEdit(expense)}
          className="rounded border border-neutral-300 px-2 py-1 text-sm"
        >
          แก้ไข
        </button>
        <button
          type="button"
          aria-label={`ลบ ${expense.title}`}
          onClick={() => onDelete(expense.id)}
          className="rounded border border-neutral-300 px-2 py-1 text-sm"
        >
          ลบ
        </button>
      </div>
    </li>
  )
}
```

- [x] **Step 4: รันเทสให้ผ่าน**

Run: `pnpm test`
Expected: PASS ทุกไฟล์ (22 tests)

---

### Task 4: `ExpenseList`

**Files:**
- Create: `web/src/components/ExpenseList.tsx`
- Test: `web/src/components/ExpenseList.test.tsx`

**Interfaces:**
- Consumes: `Expense` (Task 2), `ExpenseRow` (Task 3)
- Produces: `ExpenseList({ expenses: Expense[]; onEdit: (expense: Expense) => void; onDelete: (id: string) => void; emptyText: string })`
  - `emptyText` แสดงเป็นย่อหน้าเดียวเมื่อ `expenses` ว่าง

- [x] **Step 1: เขียนเทสที่ยังไม่ผ่าน**

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ExpenseList } from './ExpenseList'
import type { Expense } from '../lib/types'

function makeExpense(id: string, title: string, amount: string): Expense {
  return {
    id,
    title,
    amount,
    spentOn: '2026-11-22',
    note: null,
    createdAt: '2026-11-24T00:00:00.000Z',
    updatedAt: '2026-11-24T00:00:00.000Z',
  }
}

describe('ExpenseList', () => {
  it('shows one row per expense', () => {
    render(
      <ExpenseList
        expenses={[makeExpense('1', 'ข้าวเที่ยง', '125.50'), makeExpense('2', 'ค่าเดินทาง', '300.00')]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        emptyText="ยังไม่มีรายจ่ายในเดือนนี้"
      />,
    )

    expect(screen.getByText('ข้าวเที่ยง')).toBeInTheDocument()
    expect(screen.getByText('ค่าเดินทาง')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('shows the empty text when there is nothing to list', () => {
    render(
      <ExpenseList
        expenses={[]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        emptyText="ยังไม่มีรายจ่ายในเดือนนี้"
      />,
    )

    expect(screen.getByText('ยังไม่มีรายจ่ายในเดือนนี้')).toBeInTheDocument()
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument()
  })
})
```

- [x] **Step 2: รันเทสให้เห็นว่าไม่ผ่าน**

Run: `pnpm exec vitest run src/components/ExpenseList.test.tsx`
Expected: FAIL — `Failed to resolve import "./ExpenseList"`

- [x] **Step 3: เขียน `src/components/ExpenseList.tsx`**

```tsx
import { ExpenseRow } from './ExpenseRow'
import type { Expense } from '../lib/types'

interface ExpenseListProps {
  expenses: Expense[]
  onEdit: (expense: Expense) => void
  onDelete: (id: string) => void
  emptyText: string
}

export function ExpenseList({ expenses, onEdit, onDelete, emptyText }: ExpenseListProps) {
  if (expenses.length === 0) {
    return <p className="py-8 text-center text-neutral-500">{emptyText}</p>
  }

  return (
    <ul>
      {expenses.map((expense) => (
        <ExpenseRow key={expense.id} expense={expense} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </ul>
  )
}
```

- [x] **Step 4: รันเทสให้ผ่าน**

Run: `pnpm test`
Expected: PASS ทุกไฟล์ (24 tests)

---

### Task 5: `ExpenseForm`

**Files:**
- Create: `web/src/components/ExpenseForm.tsx`
- Test: `web/src/components/ExpenseForm.test.tsx`

**Interfaces:**
- Consumes: `Expense`, `ExpenseInput` (Task 2)
- Produces: `ExpenseForm({ initial?: Expense; onSubmit: (input: ExpenseInput) => void | Promise<void>; onCancel?: () => void })`
  - label ของช่อง: `ชื่อรายจ่าย`, `จำนวนเงิน`, `วันที่`, `หมายเหตุ`
  - ปุ่ม: `เพิ่มรายจ่าย` (โหมดเพิ่ม), `บันทึก` + `ยกเลิก` (โหมดแก้)
  - กติกาตรวจ: title trim แล้ว 1–120 ตัวอักษร; `amount` ต้องตรง `/^\d+\.\d{2}$/` และมากกว่า 0; `spentOn` ต้องตรง `/^\d{4}-\d{2}-\d{2}$/`; `note` trim แล้วไม่เกิน 500 ตัวอักษร และส่ง `null` เมื่อว่าง

- [x] **Step 1: เขียนเทสที่ยังไม่ผ่าน**

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ExpenseForm } from './ExpenseForm'
import type { Expense } from '../lib/types'

const expense: Expense = {
  id: 'exp-1',
  title: 'ข้าวเที่ยง',
  amount: '125.50',
  spentOn: '2026-11-22',
  note: 'กับข้าว',
  createdAt: '2026-11-24T00:00:00.000Z',
  updatedAt: '2026-11-24T00:00:00.000Z',
}

describe('ExpenseForm', () => {
  it('submits trimmed values and a null note when note is blank', async () => {
    const onSubmit = vi.fn()
    render(<ExpenseForm onSubmit={onSubmit} />)

    await userEvent.type(screen.getByLabelText('ชื่อรายจ่าย'), '  ข้าวเที่ยง  ')
    await userEvent.type(screen.getByLabelText('จำนวนเงิน'), '125.50')
    await userEvent.type(screen.getByLabelText('วันที่'), '2026-11-22')
    await userEvent.type(screen.getByLabelText('หมายเหตุ'), '   ')
    await userEvent.click(screen.getByRole('button', { name: 'เพิ่มรายจ่าย' }))

    expect(onSubmit).toHaveBeenCalledWith({
      title: 'ข้าวเที่ยง',
      amount: '125.50',
      spentOn: '2026-11-22',
      note: null,
    })
  })

  it.each(['125.5', '125.555', '0', 'abc'])(
    'rejects the amount %s without submitting',
    async (amount) => {
      const onSubmit = vi.fn()
      render(<ExpenseForm onSubmit={onSubmit} />)

      await userEvent.type(screen.getByLabelText('ชื่อรายจ่าย'), 'ข้าวเที่ยง')
      await userEvent.type(screen.getByLabelText('จำนวนเงิน'), amount)
      await userEvent.type(screen.getByLabelText('วันที่'), '2026-11-22')
      await userEvent.click(screen.getByRole('button', { name: 'เพิ่มรายจ่าย' }))

      expect(screen.getByText(/ทศนิยม 2 ตำแหน่ง/)).toBeInTheDocument()
      expect(onSubmit).not.toHaveBeenCalled()
    },
  )

  it('prefills the fields in edit mode and submits the changes', async () => {
    const onSubmit = vi.fn()
    render(<ExpenseForm initial={expense} onSubmit={onSubmit} onCancel={vi.fn()} />)

    expect(screen.getByLabelText('ชื่อรายจ่าย')).toHaveValue('ข้าวเที่ยง')
    expect(screen.getByLabelText('จำนวนเงิน')).toHaveValue('125.50')
    expect(screen.getByLabelText('วันที่')).toHaveValue('2026-11-22')

    await userEvent.clear(screen.getByLabelText('จำนวนเงิน'))
    await userEvent.type(screen.getByLabelText('จำนวนเงิน'), '150.00')
    await userEvent.click(screen.getByRole('button', { name: 'บันทึก' }))

    expect(onSubmit).toHaveBeenCalledWith({
      title: 'ข้าวเที่ยง',
      amount: '150.00',
      spentOn: '2026-11-22',
      note: 'กับข้าว',
    })
  })
})
```

- [x] **Step 2: รันเทสให้เห็นว่าไม่ผ่าน**

Run: `pnpm exec vitest run src/components/ExpenseForm.test.tsx`
Expected: FAIL — `Failed to resolve import "./ExpenseForm"`

- [x] **Step 3: เขียน `src/components/ExpenseForm.tsx`**

`spentOn` ใช้ `<input type="text" inputMode="numeric" placeholder="2026-11-22">` ไม่ใช่ `type="date"` เพื่อให้ validation เป็นของเราและ `userEvent.type` ใช้ได้ทั้งเบราว์เซอร์จริงกับ jsdom

```tsx
'use client'

import { useState } from 'react'
import type { Expense, ExpenseInput } from '../lib/types'

const AMOUNT_PATTERN = /^\d+\.\d{2}$/
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

interface ExpenseFormProps {
  initial?: Expense
  onSubmit: (input: ExpenseInput) => void | Promise<void>
  onCancel?: () => void
}

export function ExpenseForm({ initial, onSubmit, onCancel }: ExpenseFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [amount, setAmount] = useState(initial?.amount ?? '')
  const [spentOn, setSpentOn] = useState(initial?.spentOn ?? '')
  const [note, setNote] = useState(initial?.note ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextErrors: Record<string, string> = {}
    const trimmedTitle = title.trim()
    const trimmedNote = note.trim()

    if (trimmedTitle.length === 0) nextErrors.title = 'กรุณากรอกชื่อรายจ่าย'
    if (trimmedTitle.length > 120) nextErrors.title = 'ชื่อรายจ่ายไม่เกิน 120 ตัวอักษร'
    if (!AMOUNT_PATTERN.test(amount) || Number(amount) <= 0) {
      nextErrors.amount = 'จำนวนเงินต้องมีทศนิยม 2 ตำแหน่ง เช่น 125.50'
    }
    if (!DATE_PATTERN.test(spentOn)) {
      nextErrors.spentOn = 'วันที่ต้องอยู่ในรูปแบบ 2026-11-22'
    }
    if (trimmedNote.length > 500) nextErrors.note = 'หมายเหตุไม่เกิน 500 ตัวอักษร'

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    void onSubmit({
      title: trimmedTitle,
      amount,
      spentOn,
      note: trimmedNote.length === 0 ? null : trimmedNote,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm">ชื่อรายจ่าย</span>
        <input value={title} onChange={(event) => setTitle(event.target.value)} className="rounded border px-2 py-1" />
        {errors.title ? <span className="text-sm text-red-600">{errors.title}</span> : null}
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm">จำนวนเงิน</span>
        <input
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          inputMode="decimal"
          placeholder="125.50"
          className="rounded border px-2 py-1"
        />
        {errors.amount ? <span className="text-sm text-red-600">{errors.amount}</span> : null}
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm">วันที่</span>
        <input
          value={spentOn}
          onChange={(event) => setSpentOn(event.target.value)}
          placeholder="2026-11-22"
          className="rounded border px-2 py-1"
        />
        {errors.spentOn ? <span className="text-sm text-red-600">{errors.spentOn}</span> : null}
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm">หมายเหตุ</span>
        <input value={note} onChange={(event) => setNote(event.target.value)} className="rounded border px-2 py-1" />
        {errors.note ? <span className="text-sm text-red-600">{errors.note}</span> : null}
      </label>

      <div className="flex gap-2">
        <button type="submit" className="rounded bg-neutral-900 px-3 py-1.5 text-sm text-white">
          {initial ? 'บันทึก' : 'เพิ่มรายจ่าย'}
        </button>
        {onCancel ? (
          <button type="button" onClick={onCancel} className="rounded border px-3 py-1.5 text-sm">
            ยกเลิก
          </button>
        ) : null}
      </div>
    </form>
  )
}
```

`'use client'` จำเป็นเพราะหน้ารายจ่าย import ฟอร์มนี้ไปใช้ และมีการใช้ `useState` (จะถูกเรียกผ่าน client component เท่านั้น)

- [x] **Step 4: รันเทสให้ผ่าน**

Run: `pnpm test`
Expected: PASS ทุกไฟล์ (30 tests)

---

### Task 6: ชั้น proxy ไปยัง API

**Files:**
- Modify: `web/next.config.ts`
- Create: `web/src/lib/backend.ts`
- Create: `web/src/app/api/auth/login/route.ts`
- Create: `web/src/app/api/auth/signup/route.ts`
- Create: `web/src/app/api/auth/logout/route.ts`
- Create: `web/src/app/api/expenses/route.ts`
- Create: `web/src/app/api/expenses/[id]/route.ts`
- Create: `web/.env.local` (ไม่ tracked — `.gitignore` มี `.env*` อยู่แล้ว)

**Interfaces:**
- Consumes: ไม่มี
- Produces:
  - `ACCESS_TOKEN_COOKIE = 'access_token'`
  - `getAccessToken(): Promise<string | null>`
  - `callBackend(path: string, init?: RequestInit): Promise<Response>` — แนบ `Authorization: Bearer <token>` ถ้ามี cookie, ใช้ `cache: 'no-store'`
  - `passThrough(response: Response): Promise<Response>` — คัดลอก status/body; ถ้า status 401 จะลบ cookie ก่อน
  - `setSessionCookie(accessToken: string, maxAge: number): Promise<void>`
  - `clearSessionCookie(): Promise<void>`
  - สัญญา HTTP ตามตารางใน spec: `/api/auth/login` → `200 {ok:true}`, `/api/auth/signup` → `201 {ok:true}`, `/api/auth/logout` → `204`, `/api/expenses` GET → อาร์เรย์ `Expense[]`, POST → `Expense`, `/api/expenses/:id` PATCH → `Expense`, DELETE → `204`

- [x] **Step 1: ปรับ `web/next.config.ts`**

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
```

- [x] **Step 2: สร้าง `web/.env.local`**

```
API_URL=http://127.0.0.1:3000
```

- [x] **Step 3: เขียน `src/lib/backend.ts`**

```ts
import { cookies } from 'next/headers'

export const ACCESS_TOKEN_COOKIE = 'access_token'

const API_URL = process.env.API_URL ?? 'http://127.0.0.1:3000'

export async function getAccessToken(): Promise<string | null> {
  const store = await cookies()
  return store.get(ACCESS_TOKEN_COOKIE)?.value ?? null
}

export async function callBackend(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken()
  const headers = new Headers(init.headers)
  headers.set('content-type', 'application/json')
  if (token) headers.set('authorization', `Bearer ${token}`)

  return fetch(`${API_URL}${path}`, { ...init, headers, cache: 'no-store' })
}

export async function passThrough(response: Response): Promise<Response> {
  if (response.status === 401) await clearSessionCookie()
  if (response.status === 204) return new Response(null, { status: 204 })
  const body = await response.text()
  return new Response(body, {
    status: response.status,
    headers: { 'content-type': 'application/json' },
  })
}

export async function setSessionCookie(accessToken: string, maxAge: number): Promise<void> {
  const store = await cookies()
  store.set(ACCESS_TOKEN_COOKIE, accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge,
    secure: process.env.NODE_ENV === 'production',
  })
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies()
  store.delete(ACCESS_TOKEN_COOKIE)
}
```

- [x] **Step 4: เขียน route handler ทั้ง 5 ไฟล์**

`src/app/api/auth/login/route.ts`

```ts
import { callBackend, passThrough, setSessionCookie } from '../../../../lib/backend'

export async function POST(request: Request) {
  const body = await request.json()
  const response = await callBackend('/auth/login', { method: 'POST', body: JSON.stringify(body) })
  if (!response.ok) return passThrough(response)

  const { accessToken, expiresIn } = await response.json()
  await setSessionCookie(accessToken, expiresIn)
  return Response.json({ ok: true })
}
```

`src/app/api/auth/signup/route.ts` — สมัครแล้วล็อกอินต่อในคำขอเดียว

```ts
import { callBackend, passThrough, setSessionCookie } from '../../../../lib/backend'

export async function POST(request: Request) {
  const body = await request.json()
  const signup = await callBackend('/auth/signup', { method: 'POST', body: JSON.stringify(body) })
  if (!signup.ok) return passThrough(signup)

  const login = await callBackend('/auth/login', { method: 'POST', body: JSON.stringify(body) })
  if (!login.ok) return passThrough(login)

  const { accessToken, expiresIn } = await login.json()
  await setSessionCookie(accessToken, expiresIn)
  return Response.json({ ok: true }, { status: 201 })
}
```

`src/app/api/auth/logout/route.ts`

```ts
import { clearSessionCookie } from '../../../../lib/backend'

export async function POST() {
  await clearSessionCookie()
  return new Response(null, { status: 204 })
}
```

`src/app/api/expenses/route.ts`

```ts
import { callBackend, passThrough } from '../../../lib/backend'

export async function GET() {
  return passThrough(await callBackend('/expenses?limit=100'))
}

export async function POST(request: Request) {
  const body = await request.json()
  return passThrough(await callBackend('/expenses', { method: 'POST', body: JSON.stringify(body) }))
}
```

`src/app/api/expenses/[id]/route.ts`

```ts
import { callBackend, passThrough } from '../../../../lib/backend'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.json()
  return passThrough(
    await callBackend(`/expenses/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  )
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return passThrough(await callBackend(`/expenses/${id}`, { method: 'DELETE' }))
}
```

- [x] **Step 5: ตรวจว่า build ผ่านและ route ถูกสร้าง**

Run: `pnpm build`
Expected: PASS และ output มี `/api/auth/login`, `/api/auth/signup`, `/api/auth/logout`, `/api/expenses`, `/api/expenses/[id]` เป็น ƒ (Dynamic)

ถ้า build ฟ้องเรื่อง `cookies()` หรือ prerender ให้ตรวจว่า `cacheComponents: false` ถูกบันทึกจริงใน `next.config.ts`

---

### Task 7: ชั้นข้อมูลฝั่งเบราว์เซอร์ + หน้าจอรายจ่าย

**Files:**
- Create: `web/src/lib/api-client.ts`
- Create: `web/src/lib/use-expenses.ts`
- Create: `web/src/components/SummaryBar.tsx`
- Create: `web/src/components/ExpensesScreen.tsx`

**Interfaces:**
- Consumes: `Expense`, `ExpenseInput` (Task 2), `formatAmount` (Task 1), `filterByMonth`/`sumCents` (Task 2), `ExpenseList` (Task 4), `ExpenseForm` (Task 5)
- Produces:
  - `ApiError extends Error` มี `status: number`
  - `listExpenses(): Promise<Expense[]>`, `createExpense(input: ExpenseInput): Promise<Expense>`, `updateExpense(id: string, input: ExpenseInput): Promise<Expense>`, `deleteExpense(id: string): Promise<void>`, `login(email: string, password: string): Promise<void>`, `signup(email: string, password: string): Promise<void>`, `logout(): Promise<void>`
  - `useExpenses(): { expenses: Expense[]; loading: boolean; error: string | null; reload(): Promise<void>; create(input: ExpenseInput): Promise<void>; update(id: string, input: ExpenseInput): Promise<void>; remove(id: string): Promise<void> }`
  - `SummaryBar({ total: string; count: number })`
  - `ExpensesScreen()` — client component ใช้ใน Task 8

- [x] **Step 1: เขียน `src/lib/api-client.ts`**

```ts
import type { Expense, ExpenseInput } from './types'

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
    this.name = 'ApiError'
  }
}

async function readMessage(response: Response): Promise<string> {
  const body = await response.json().catch(() => null)
  const message = body?.message
  if (Array.isArray(message)) return message.join(', ')
  if (typeof message === 'string') return message
  return 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง'
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { 'content-type': 'application/json', ...init.headers },
  })
  if (!response.ok) throw new ApiError(await readMessage(response), response.status)
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export function listExpenses(): Promise<Expense[]> {
  return request<Expense[]>('/api/expenses')
}

export function createExpense(input: ExpenseInput): Promise<Expense> {
  return request<Expense>('/api/expenses', { method: 'POST', body: JSON.stringify(input) })
}

export function updateExpense(id: string, input: ExpenseInput): Promise<Expense> {
  return request<Expense>(`/api/expenses/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
}

export function deleteExpense(id: string): Promise<void> {
  return request<void>(`/api/expenses/${id}`, { method: 'DELETE' })
}

export function login(email: string, password: string): Promise<void> {
  return request<void>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
}

export function signup(email: string, password: string): Promise<void> {
  return request<void>('/api/auth/signup', { method: 'POST', body: JSON.stringify({ email, password }) })
}

export function logout(): Promise<void> {
  return request<void>('/api/auth/logout', { method: 'POST' })
}
```

- [x] **Step 2: เขียน `src/lib/use-expenses.ts`**

```ts
'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  ApiError,
  createExpense,
  deleteExpense,
  listExpenses,
  updateExpense,
} from './api-client'
import type { Expense, ExpenseInput } from './types'

function messageFor(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 400) return 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง'
    if (error.status === 404) return 'ไม่พบรายจ่ายนี้'
    return error.message
  }
  return 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่'
}

export function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const redirectToLogin = useCallback(() => {
    window.location.assign('/login')
  }, [])

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      setExpenses(await listExpenses())
      setError(null)
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {
        redirectToLogin()
        return
      }
      setError(messageFor(cause))
    } finally {
      setLoading(false)
    }
  }, [redirectToLogin])

  useEffect(() => {
    void reload()
  }, [reload])

  const create = useCallback(
    async (input: ExpenseInput) => {
      try {
        await createExpense(input)
        await reload()
      } catch (cause) {
        setError(messageFor(cause))
      }
    },
    [reload],
  )

  const update = useCallback(
    async (id: string, input: ExpenseInput) => {
      try {
        await updateExpense(id, input)
        await reload()
      } catch (cause) {
        setError(messageFor(cause))
      }
    },
    [reload],
  )

  const remove = useCallback(
    async (id: string) => {
      try {
        await deleteExpense(id)
        await reload()
      } catch (cause) {
        setError(messageFor(cause))
      }
    },
    [reload],
  )

  return { expenses, loading, error, reload, create, update, remove }
}
```

- [x] **Step 3: เขียน `src/components/SummaryBar.tsx`**

```tsx
interface SummaryBarProps {
  total: string
  count: number
}

export function SummaryBar({ total, count }: SummaryBarProps) {
  return (
    <div className="flex items-baseline justify-between border-b border-neutral-200 pb-3">
      <span className="text-sm text-neutral-500">รวม {count} รายการ</span>
      <span className="font-mono text-xl tabular-nums">{total}</span>
    </div>
  )
}
```

- [x] **Step 4: เขียน `src/components/ExpensesScreen.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ExpenseForm } from './ExpenseForm'
import { ExpenseList } from './ExpenseList'
import { SummaryBar } from './SummaryBar'
import { logout } from '../lib/api-client'
import { filterByMonth, sumCents } from '../lib/expenses'
import { formatAmount } from '../lib/format'
import { useExpenses } from '../lib/use-expenses'
import type { Expense, ExpenseInput } from '../lib/types'

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7)
}

export function ExpensesScreen() {
  const router = useRouter()
  const { expenses, loading, error, reload, create, update, remove } = useExpenses()
  const [month, setMonth] = useState(currentMonth)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [adding, setAdding] = useState(false)

  const visible = filterByMonth(expenses, month)

  async function handleCreate(input: ExpenseInput) {
    await create(input)
    setAdding(false)
  }

  async function handleUpdate(id: string, input: ExpenseInput) {
    await update(id, input)
    setEditing(null)
  }

  async function handleLogout() {
    await logout()
    router.push('/login')
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">รายจ่าย</h1>
        <div className="flex items-center gap-2">
          <input
            type="month"
            aria-label="เดือน"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            className="rounded border px-2 py-1"
          />
          <button type="button" onClick={handleLogout} className="rounded border px-3 py-1 text-sm">
            ออกจากระบบ
          </button>
        </div>
      </header>

      <SummaryBar total={formatAmount(sumCents(visible))} count={visible.length} />

      {loading ? <p className="text-neutral-500">กำลังโหลด…</p> : null}

      {error ? (
        <div className="flex items-center justify-between rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          <span>{error}</span>
          <button type="button" onClick={() => void reload()} className="rounded border px-2 py-1">
            ลองใหม่
          </button>
        </div>
      ) : null}

      {adding ? (
        <ExpenseForm onSubmit={handleCreate} onCancel={() => setAdding(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="self-start rounded bg-neutral-900 px-3 py-1.5 text-sm text-white"
        >
          เพิ่มรายจ่าย
        </button>
      )}

      {editing ? (
        <ExpenseForm
          key={editing.id}
          initial={editing}
          onSubmit={(input) => handleUpdate(editing.id, input)}
          onCancel={() => setEditing(null)}
        />
      ) : null}

      <ExpenseList
        expenses={visible}
        onEdit={setEditing}
        onDelete={(id) => void remove(id)}
        emptyText="ยังไม่มีรายจ่ายในเดือนนี้"
      />
    </main>
  )
}
```

หมายเหตุ: `currentMonth()` ใช้ `toISOString()` ซึ่งเป็น UTC — ยอมรับได้เพราะเป็นแค่ค่าเริ่มต้นของตัวกรอง และไม่ถูก unit test (ถ้าจะทำให้ตรงเวลาไทยต้องเพิ่ม dependency ซึ่งขัด constraint)

- [x] **Step 5: ตรวจว่า type และ lint ผ่าน**

Run: `pnpm lint && pnpm build`
Expected: PASS ทั้งคำสั่ง

---

### Task 8: หน้า login / signup / guard

**Files:**
- Create: `web/src/app/login/page.tsx`
- Create: `web/src/app/signup/page.tsx`
- Create: `web/src/app/expenses/page.tsx`
- Modify: `web/src/app/page.tsx` (แทนที่หน้าตัวอย่างของ create-next-app)
- Modify: `web/src/app/layout.tsx` (metadata + `lang="th"`)
- Modify: `web/src/app/globals.css` (พื้นหลัง/ตัวอักษรให้เรียบง่าย)

**Interfaces:**
- Consumes: `login`/`signup` (Task 7), `getAccessToken` (Task 6), `ExpensesScreen` (Task 7)
- Produces: เส้นทาง `/login`, `/signup`, `/expenses` ที่ใช้งานได้

- [x] **Step 1: เขียน `src/app/login/page.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { login } from '../../lib/api-client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSending(true)
    setError(null)
    try {
      await login(email, password)
      router.push('/expenses')
    } catch {
      setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง')
    } finally {
      setSending(false)
    }
  }

  return (
    <main className="mx-auto w-full max-w-sm p-6">
      <h1 className="mb-6 text-xl font-semibold">บันทึกรายจ่าย</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm">อีเมล</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className="rounded border px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm">รหัสผ่าน</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            className="rounded border px-2 py-1"
          />
        </label>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={sending}
          className="rounded bg-neutral-900 px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          เข้าสู่ระบบ
        </button>
      </form>
      <p className="mt-4 text-sm text-neutral-500">
        ยังไม่มีบัญชี? <Link href="/signup" className="underline">สมัครสมาชิก</Link>
      </p>
    </main>
  )
}
```

- [x] **Step 2: เขียน `src/app/signup/page.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ApiError, signup } from '../../lib/api-client'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (password.length < 12) {
      setError('รหัสผ่านอย่างน้อย 12 ตัวอักษร')
      return
    }
    setSending(true)
    setError(null)
    try {
      await signup(email, password)
      router.push('/expenses')
    } catch (cause) {
      setError(
        cause instanceof ApiError && cause.status === 409
          ? 'อีเมลนี้ถูกใช้แล้ว'
          : 'สมัครไม่สำเร็จ กรุณาลองใหม่',
      )
    } finally {
      setSending(false)
    }
  }

  return (
    <main className="mx-auto w-full max-w-sm p-6">
      <h1 className="mb-6 text-xl font-semibold">สมัครสมาชิก</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm">อีเมล</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className="rounded border px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm">รหัสผ่าน</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            className="rounded border px-2 py-1"
          />
          <span className="text-xs text-neutral-500">อย่างน้อย 12 ตัวอักษร</span>
        </label>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={sending}
          className="rounded bg-neutral-900 px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          สมัครสมาชิก
        </button>
      </form>
      <p className="mt-4 text-sm text-neutral-500">
        มีบัญชีแล้ว? <Link href="/login" className="underline">เข้าสู่ระบบ</Link>
      </p>
    </main>
  )
}
```

- [x] **Step 3: เขียน `src/app/expenses/page.tsx`**

```tsx
import { redirect } from 'next/navigation'
import { ExpensesScreen } from '../../components/ExpensesScreen'
import { getAccessToken } from '../../lib/backend'

export default async function ExpensesPage() {
  const token = await getAccessToken()
  if (token === null) redirect('/login')
  return <ExpensesScreen />
}
```

- [x] **Step 4: แทน `src/app/page.tsx`**

```tsx
import { redirect } from 'next/navigation'
import { getAccessToken } from '../lib/backend'

export default async function HomePage() {
  const token = await getAccessToken()
  redirect(token === null ? '/login' : '/expenses')
}
```

- [x] **Step 5: ปรับ `src/app/layout.tsx`**

เปลี่ยน `lang="en"` เป็น `lang="th"` และ metadata เป็น

```ts
export const metadata: Metadata = {
  title: "บันทึกรายจ่าย",
  description: "รายจ่ายส่วนตัว ตัวอย่างการสอน unit test",
};
```

คงฟอนต์ Geist ไว้ — ตัวอักษรไทยจะ fallback ไปฟอนต์ระบบเอง ไม่ต้องเพิ่ม dependency

- [x] **Step 6: ปรับพื้นหลังใน `src/app/globals.css`**

ลบ `@media (prefers-color-scheme: dark)` ทั้งบล็อก (แอปจะมีโทนเดียว) และตั้ง `body` เป็น

```css
body {
  background: #fafafa;
  color: var(--foreground);
  font-family: var(--font-geist-sans), system-ui, sans-serif;
}
```

- [x] **Step 7: ตรวจว่า test + lint + build ผ่าน**

Run: `pnpm test && pnpm lint && pnpm build`
Expected: PASS ทั้งสามคำสั่ง และ output ของ build มี `/login`, `/signup`, `/expenses` เป็น ƒ (Dynamic)

---

### Task 9: README + smoke test กับ API จริง

**Files:**
- Modify: `web/README.md`

**Interfaces:**
- Consumes: ทุก task ก่อนหน้า
- Produces: คำแนะนำการรันที่ทำตามได้จาก checkout ใหม่

- [x] **Step 1: เขียน `web/README.md` ใหม่**

เนื้อหาที่ต้องมี (ไทย):

1. ภาพรวมสั้น ๆ ว่าเว็บนี้คืออะไรและเป็นตัวอย่างการสอน unit test
2. สิ่งที่ต้องมี: Node 20+, pnpm, PostgreSQL รันอยู่ที่ `127.0.0.1:5432`, API ใน `api/` พร้อมใช้งาน
3. ขั้นตอน: `cd api && pnpm install && pnpm exec prisma migrate deploy && pnpm start:dev` แล้ว `cd web && pnpm install && pnpm dev` เปิด `http://localhost:3001`
4. `API_URL` (ค่าเริ่มต้น `http://127.0.0.1:3000`) และ cookie `access_token` เป็น httpOnly
5. หัวข้อ "ทำไมมีเทสแค่ 5 ไฟล์" อธิบายว่าอะไรถูกเทส (ฟังก์ชันบริสุทธิ์ + คอมโพเนนต์รับ props) อะไรตั้งใจไม่เทส (route handler, hook, หน้า login/signup) และเหตุผล
6. คำสั่ง `pnpm test`, `pnpm test:watch`, `pnpm lint`, `pnpm build`

- [x] **Step 2: apply migration ให้ฐาน dev**

Run: `cd api && pnpm exec prisma migrate deploy`
Expected: `1 migration found` → applied → `All migrations have been successfully applied.`

- [x] **Step 3: เปิด API**

Run: `cd api && pnpm start:dev` (เปิดเป็น background process)
Expected: log `Nest application successfully started` และฟังที่พอร์ต 3000

- [x] **Step 4: เปิดเว็บ**

Run: `cd web && pnpm dev` (เปิดเป็น background process)
Expected: log `Ready` และฟังที่พอร์ต 3001

- [x] **Step 5: ตรวจเส้นทาง proxy ด้วย curl**

Run (ใช้ `-c` เก็บ cookie และ `-b` ส่งกลับ):

```bash
curl -si -c /tmp/et.cookies -X POST localhost:3001/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"smoke@example.com","password":"password1234"}'
```

ถ้ายังไม่มีผู้ใช้ ให้เปลี่ยน `/api/auth/login` เป็น `/api/auth/signup` (คาด `201` และมี `set-cookie: access_token=...; HttpOnly`)

```bash
curl -s -b /tmp/et.cookies localhost:3001/api/expenses
```

Expected: `200`

- [x] **Step 6: smoke test ผ่านเบราว์เซอร์**

โหลด skill `orca-cli` ก่อน แล้วเปิด Orca browser ที่ `http://localhost:3001` (ถ้าไม่ได้ใช้ Orca ให้ขอให้ผู้ใช้เปิดเอง)

1. สมัครบัญชีใหม่ → ถูกพาไป `/expenses`
2. เพิ่มรายจ่าย `ข้าวเที่ยง / 125.50 / <วันนี้>` → เห็นในรายการ ยอดรวม `125.50`
3. กด `แก้ไข` เปลี่ยนจำนวนเป็น `150.00` → ยอดรวมเปลี่ยนเป็น `150.00`
4. เปลี่ยนเดือนในช่องกรองเป็นเดือนที่ไม่มีข้อมูล → เห็น "ยังไม่มีรายจ่ายในเดือนนี้" และยอด `0.00`
5. กด `ลบ` → รายการหาย
6. กด `ออกจากระบบ` → กลับ `/login` และเปิด `/expenses` ตรง ๆ ต้องเด้งไป `/login`
7. รีเฟรชหน้า `/expenses` ระหว่างที่ยังล็อกอินอยู่ → ยังอยู่ในหน้าเดิม (cookie ทำงาน)

- [x] **Step 7: ปิด dev server และตรวจครั้งสุดท้าย**

Run: `cd web && pnpm test && pnpm lint && pnpm build`
Expected: PASS ทั้งสามคำสั่ง

---

## Self-Review Notes

- ทุกหัวข้อใน spec มี task รองรับ: format/expenses → Task 1–2, คอมโพเนนต์ 4 ตัว → Task 3–5 + SummaryBar ใน Task 7, proxy/cookie → Task 6, หน้าและ guard → Task 8, เกณฑ์เสร็จ/README/smoke → Task 9, `next.config.ts` → Task 6 Step 1
- ชื่อที่ใช้ซ้ำกันทุก task: `formatAmount(cents)`, `formatThaiDate(spentOn)`, `filterByMonth(expenses, month)`, `sumCents(expenses)`, `toCents(amount)`, `ExpenseInput`, `useExpenses()` คืน `{ expenses, loading, error, reload, create, update, remove }`, `ExpenseList` รับ `emptyText`
- โค้ดที่ให้มาเป็น "ค่าที่ตัดสินแล้ว" (ชื่อ, กติกาตรวจ, ข้อความ aria-label, path ของ route) ไม่ใช่ทั้งโปรแกรม — task ที่เหลือให้ผู้ลงมือเขียนเองตามธรรมชาติของงาน
