// ============================================================
// ตัวช่วยสำหรับเทส Playwright (เตรียมไว้ให้แล้ว ผู้เรียนไม่ต้องเขียนเอง)
// ============================================================
// หลักคิด: เทสนี้ "เปิดเบราว์เซอร์จริง" เข้าหน้าเว็บจริง แต่ไม่เรียก API จริง
// เราดักจับ (intercept) request ที่เบราว์เซอร์ยิงไปที่ /api/... ด้วย page.route()
// แล้วตอบกลับข้อมูลปลอมแทน จึงไม่ต้องรัน backend และผลเทสคงที่ทุกครั้ง

import type { BrowserContext, Page } from '@playwright/test'

export interface Expense {
  id: string
  title: string
  amount: string
  spentOn: string
  note: string | null
  createdAt: string
  updatedAt: string
}

// สร้างรายจ่ายตัวอย่าง วันที่ใช้ "เดือนปัจจุบัน" เสมอ
// เพราะหน้าเว็บกรองแสดงเฉพาะเดือนที่เลือก (ค่าเริ่มต้นคือเดือนนี้)
export function makeExpense(title: string, amount: string, id = title): Expense {
  const now = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  return {
    id,
    title,
    amount,
    spentOn: `${month}-15`,
    note: null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  }
}

// หน้า /expenses ตรวจ cookie ที่ฝั่งเซิร์ฟเวอร์ (page.route ดักไม่ได้)
// จึงต้องใส่ cookie ปลอมให้เบราว์เซอร์ก่อน เพื่อ "ทำเป็นล็อกอินแล้ว"
export async function loginAs(context: BrowserContext) {
  await context.addCookies([
    { name: 'access_token', value: 'fake-token', url: 'http://localhost:3001' },
  ])
}

// ดักจับ API รายจ่ายทั้งหมด แล้วตอบจากอาร์เรย์ในหน่วยความจำ
// คืนอาร์เรย์นั้นกลับไป เผื่อเทสอยากเช็คว่า "ฝั่งเว็บส่งอะไรมา"
export async function mockExpenses(page: Page, initial: Expense[]) {
  const expenses = [...initial]

  // /api/expenses  → GET (ดึงรายการ) และ POST (เพิ่มรายการ)
  await page.route('**/api/expenses', async (route) => {
    const request = route.request()
    if (request.method() === 'POST') {
      const body = request.postDataJSON()
      const created = { ...makeExpense(body.title, body.amount, `new-${expenses.length}`), ...body }
      expenses.push(created)
      await route.fulfill({ status: 201, json: created })
      return
    }
    await route.fulfill({ json: expenses })
  })

  // /api/expenses/<id> → DELETE (ลบรายการ)
  await page.route('**/api/expenses/*', async (route) => {
    // id ใน URL ถูก encode (ภาษาไทยกลายเป็น %E0...) จึงต้อง decode ก่อนเทียบ
    const id = decodeURIComponent(route.request().url().split('/').pop() ?? '')
    const index = expenses.findIndex((e) => e.id === id)
    if (index >= 0) expenses.splice(index, 1)
    await route.fulfill({ status: 204 })
  })

  return expenses
}
