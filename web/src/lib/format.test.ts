// ============================================================
// บทที่ 1 (2/2): เทสฟังก์ชันจัดรูปแบบใน src/lib/format.ts
// ============================================================
// ฟังก์ชันที่รับค่าเข้า → คืนค่าออก โดยไม่ยุ่งกับอะไรข้างนอก (เรียกว่า pure function)
// เป็นของที่เทสง่ายที่สุด จึงเริ่มบทเรียนที่นี่

import { describe, it, expect } from 'vitest'
import { formatAmount, formatThaiDate } from './format'

describe('formatAmount', () => {
  it('shows cents as baht with two decimals', () => {
    // 12550 สตางค์ = 125.50 บาท
    expect(formatAmount(12550)).toBe('125.50')
  })

  it('adds thousands separators', () => {
    expect(formatAmount(123456789)).toBe('1,234,567.89')
  })
})

describe('formatThaiDate', () => {
  it('formats a date with a Thai month and Buddhist year', () => {
    // ปี พ.ศ. = ปี ค.ศ. + 543  →  2026 + 543 = 2569
    expect(formatThaiDate('2026-11-22')).toBe('22 พ.ย. 2569')
  })

  it('does not pad the day with a zero', () => {
    expect(formatThaiDate('2026-01-01')).toBe('1 ม.ค. 2569')
  })
})
