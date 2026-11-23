// ============================================================
// บทที่ 3: เทสคอมโพเนนต์ React ด้วย Testing Library
// ============================================================
// หลักคิด: เทสสิ่งที่ "ผู้ใช้เห็นและกด" ไม่ใช่โค้ดข้างใน
//   render(<Component />)        → วาดคอมโพเนนต์ลงใน DOM จำลอง (jsdom)
//   screen.getByText / getByRole → ค้นหาสิ่งที่ผู้ใช้เห็น
//   screen.queryByText           → เหมือน getBy แต่ถ้าไม่เจอจะคืน null (ใช้เช็คว่า "ไม่มี")
//   userEvent                    → จำลองการคลิก/พิมพ์เหมือนผู้ใช้จริง
//   vi.fn()                      → ฟังก์ชันปลอมไว้เช็คว่า "ถูกเรียกไหม ด้วยอะไร"
//
// รันเทส:  pnpm test

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExpenseRow } from './ExpenseRow'
import type { Expense } from '../lib/types'

const expense: Expense = {
  id: 'expense-1',
  title: 'ข้าวกลางวัน',
  amount: '125.50',
  spentOn: '2026-11-22',
  note: null,
  createdAt: '2026-11-22T00:00:00.000Z',
  updatedAt: '2026-11-22T00:00:00.000Z',
}

// ExpenseRow เป็น <li> จึงต้องวางใน <ul> ไม่งั้น HTML ไม่ถูกต้อง
function renderRow(overrides: Partial<Expense> = {}) {
  const onEdit = vi.fn()
  const onDelete = vi.fn()
  render(
    <ul>
      <ExpenseRow expense={{ ...expense, ...overrides }} onEdit={onEdit} onDelete={onDelete} />
    </ul>,
  )
  return { onEdit, onDelete }
}

describe('ExpenseRow', () => {
  it('shows the title, Thai date and formatted amount', () => {
    renderRow()

    // toBeInTheDocument มาจาก @testing-library/jest-dom (ตั้งไว้ใน src/test/setup.ts แล้ว)
    expect(screen.getByText('ข้าวกลางวัน')).toBeInTheDocument()
    expect(screen.getByText('22 พ.ย. 2569')).toBeInTheDocument()
    expect(screen.getByText('125.50')).toBeInTheDocument()
  })

  it('shows the note only when there is one', () => {
    renderRow({ note: 'จ่ายเงินสด' })

    expect(screen.getByText('จ่ายเงินสด')).toBeInTheDocument()
  })

  it('does not show a note when it is null', () => {
    renderRow({ note: null })

    // queryByText คืน null ถ้าไม่เจอ (getByText จะ error)
    // เช็คคำว่า 'null' ด้วย: ถ้าโค้ดพลาดเอา null ไปแสดงบนจอ เทสนี้จะจับได้
    expect(screen.queryByText('null')).not.toBeInTheDocument()
  })

  it('calls onDelete with the expense id when delete is clicked', async () => {
    const { onDelete } = renderRow()

    // หาปุ่มจาก "บทบาท + ชื่อ" (aria-label) แล้วคลิกเหมือนผู้ใช้จริง
    await userEvent.click(screen.getByRole('button', { name: 'ลบ ข้าวกลางวัน' }))

    expect(onDelete).toHaveBeenCalledTimes(1)
    expect(onDelete).toHaveBeenCalledWith('expense-1')
  })

  it('calls onEdit with the whole expense when edit is clicked', async () => {
    const { onEdit } = renderRow()

    await userEvent.click(screen.getByRole('button', { name: 'แก้ไข ข้าวกลางวัน' }))

    expect(onEdit).toHaveBeenCalledWith(expense)
  })
})
