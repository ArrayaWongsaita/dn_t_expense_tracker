// ============================================================
// บทที่ 5: E2E test ของหน้าเว็บด้วย Playwright
// ============================================================
// Playwright เปิดเบราว์เซอร์จริง (Chromium) แล้ว "ทำเหมือนผู้ใช้": เปิดหน้า พิมพ์ คลิก
// และเช็คสิ่งที่เห็นบนหน้าจอ
//
// คำสั่งสำคัญ:
//   page.goto('/expenses')                 → เปิดหน้า
//   page.getByRole('button', {name: '..'}) → หาปุ่มจากบทบาท+ชื่อ (วิธีที่แนะนำ)
//   page.getByLabel('..')                  → หาช่องกรอกจาก label
//   locator.click() / locator.fill('..')   → คลิก / พิมพ์
//   expect(locator).toBeVisible()          → เช็คว่าเห็นอยู่ (Playwright จะรอให้เองสูงสุด 5 วินาที)
//
// ทุกเทสเรียก loginAs + mockExpenses เองเสมอ เพื่อให้แต่ละเทสเป็นอิสระต่อกัน
// รันเทส:  pnpm test:e2e   (Playwright เปิด dev server ให้อัตโนมัติ)
// ดูเบราว์เซอร์ขณะรัน:  pnpm exec playwright test --headed

import { expect, test } from '@playwright/test'
import { loginAs, makeExpense, mockExpenses } from './helpers'

test('shows the empty message when there are no expenses', async ({ page, context }) => {
  await loginAs(context)
  await mockExpenses(page, []) // API ปลอมตอบรายการว่าง

  await page.goto('/expenses')

  await expect(page.getByText('ยังไม่มีรายจ่ายในเดือนนี้')).toBeVisible()
})

test('lists the expenses returned by the API', async ({ page, context }) => {
  await loginAs(context)
  await mockExpenses(page, [makeExpense('ข้าวกลางวัน', '100.00'), makeExpense('กาแฟ', '60.00')])

  await page.goto('/expenses')

  await expect(page.getByText('ข้าวกลางวัน')).toBeVisible()
  await expect(page.getByText('กาแฟ')).toBeVisible()
  await expect(page.getByText('รวม 2 รายการ')).toBeVisible()
})

test('adds a new expense through the form', async ({ page, context }) => {
  await loginAs(context)
  await mockExpenses(page, [])
  await page.goto('/expenses')

  // เปิดฟอร์ม → กรอกข้อมูล → กดบันทึก
  await page.getByRole('button', { name: 'เพิ่มรายจ่าย' }).click()
  await page.getByLabel('ชื่อรายจ่าย').fill('ค่ารถไฟฟ้า')
  await page.getByLabel('จำนวนเงิน').fill('45.00')
  const today = new Date()
  const day = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-15`
  await page.getByLabel('วันที่').fill(day)
  await page.getByRole('button', { name: 'เพิ่มรายจ่าย' }).click()

  // หลัง POST สำเร็จ หน้าเว็บโหลดรายการใหม่ → ต้องเห็นรายการที่เพิ่ม
  await expect(page.getByText('ค่ารถไฟฟ้า')).toBeVisible()
})

test('deletes an expense after confirming', async ({ page, context }) => {
  await loginAs(context)
  await mockExpenses(page, [makeExpense('กาแฟ', '60.00')])
  await page.goto('/expenses')

  // ปุ่มลบเรียก window.confirm → ต้องบอก Playwright ให้กด "ตกลง" (ตั้งก่อนคลิก)
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'ลบ กาแฟ' }).click()

  await expect(page.getByText('กาแฟ')).toBeHidden()
})

test('redirects to /login when there is no session cookie', async ({ page }) => {
  // ไม่เรียก loginAs → ไม่มี cookie
  await page.goto('/expenses')

  await expect(page).toHaveURL(/\/login$/)
})
