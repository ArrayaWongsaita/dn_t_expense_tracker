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
        expenses={[
          makeExpense('1', 'ข้าวเที่ยง', '125.50'),
          makeExpense('2', 'ค่าเดินทาง', '300.00'),
        ]}
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
