// ============================================================
// บทที่ 1 (1/2): เทสฟังก์ชันธรรมดาใน src/lib/expenses.ts
// ============================================================
// เทสคืออะไร? คือโค้ดที่ "เรียกโค้ดของเรา แล้วเช็คว่าผลลัพธ์ตรงตามที่คาดไหม"
// ถ้าตรง = ผ่าน (✓)  ถ้าไม่ตรง = ไม่ผ่าน (✗) แล้ว Vitest จะบอกว่าต่างกันตรงไหน
//
// โครงสร้างที่ใช้ในทุกเทส (เรียกว่า Arrange / Act / Assert):
//   1. Arrange — เตรียมข้อมูล
//   2. Act     — เรียกฟังก์ชันที่จะเทส
//   3. Assert  — ใช้ expect(...) เช็คผลลัพธ์
//
// รันเทส:  pnpm test   (หรือ pnpm test:watch ให้รันซ้ำอัตโนมัติเมื่อแก้ไฟล์)

import { describe, it, expect } from 'vitest'
import { filterByMonth, sumCents, toCents } from './expenses'
import type { Expense } from './types'

// ฟังก์ชันช่วยสร้างรายจ่ายตัวอย่าง ให้เขียนเทสสั้นลง
// เราแก้เฉพาะ field ที่สนใจผ่าน overrides ส่วนที่เหลือใช้ค่าเริ่มต้น
function makeExpense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: '1',
    title: 'ข้าวกลางวัน',
    amount: '10.00',
    spentOn: '2026-11-22',
    note: null,
    createdAt: '2026-11-22T00:00:00.000Z',
    updatedAt: '2026-11-22T00:00:00.000Z',
    ...overrides,
  }
}

// describe = จัดกลุ่มเทสที่เกี่ยวข้องกัน (ตั้งชื่อกลุ่มเป็นชื่อฟังก์ชัน)
describe('toCents', () => {
  // it = เทสหนึ่งข้อ ตั้งชื่อให้อ่านเหมือนประโยค: "it converts ..."
  it('converts a decimal amount string to cents', () => {
    // Act: แปลง '10.50' บาท เป็นสตางค์
    const result = toCents('10.50')

    // Assert: ต้องได้ 1050 สตางค์ (toBe ใช้เทียบค่าแบบตรงตัว)
    expect(result).toBe(1050)
  })

  it('rounds correctly when the decimal cannot be stored exactly', () => {
    // 19.99 * 100 ใน JavaScript ได้ 1998.9999999999998 (ไม่ใช่ 1999)
    // toCents ต้องปัดให้ถูก ไม่ใช่ตัดทิ้ง
    expect(toCents('19.99')).toBe(1999)
  })

  it('adds cents without floating point drift', () => {
    // ใน JavaScript: 0.1 + 0.2 = 0.30000000000000004 (เพี้ยน!)
    // เราจึงเก็บเงินเป็นสตางค์ (จำนวนเต็ม) แล้วบวกกัน จะไม่เพี้ยน
    const total = toCents('0.1') + toCents('0.2')

    expect(total).toBe(30)
  })
})

describe('sumCents', () => {
  it('returns 0 for an empty list', () => {
    expect(sumCents([])).toBe(0)
  })

  it('adds up the amounts of every expense', () => {
    const expenses = [makeExpense({ amount: '10.50' }), makeExpense({ amount: '4.25' })]

    // 1050 + 425 = 1475 สตางค์
    expect(sumCents(expenses)).toBe(1475)
  })
})

describe('filterByMonth', () => {
  it('keeps only the expenses of the given month', () => {
    const november = makeExpense({ id: 'a', spentOn: '2026-11-05' })
    const october = makeExpense({ id: 'b', spentOn: '2026-10-31' })

    const result = filterByMonth([november, october], '2026-11')

    // toEqual เทียบ "เนื้อใน" ของ array/object (ต่างจาก toBe ที่เทียบตรงตัว)
    expect(result).toEqual([november])
  })

  it('returns an empty list when there are no expenses', () => {
    expect(filterByMonth([], '2026-11')).toEqual([])
  })
})
