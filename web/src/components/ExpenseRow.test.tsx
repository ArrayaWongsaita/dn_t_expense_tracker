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
