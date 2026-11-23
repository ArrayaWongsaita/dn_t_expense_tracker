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

  it.each(['125.5', '125.555', '0', 'abc', '0125.50', '99999999999.99'])(
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

  it.each(['2026-02-31', '2026-13-01', '0000-01-01'])(
    'rejects the date %s without submitting',
    async (spentOn) => {
      const onSubmit = vi.fn()
      render(<ExpenseForm onSubmit={onSubmit} />)

      await userEvent.type(screen.getByLabelText('ชื่อรายจ่าย'), 'ข้าวเที่ยง')
      await userEvent.type(screen.getByLabelText('จำนวนเงิน'), '125.50')
      await userEvent.type(screen.getByLabelText('วันที่'), spentOn)
      await userEvent.click(screen.getByRole('button', { name: 'เพิ่มรายจ่าย' }))

      expect(screen.getByText(/วันที่ต้องอยู่ในรูปแบบ/)).toBeInTheDocument()
      expect(onSubmit).not.toHaveBeenCalled()
    },
  )

  it('disables the submit button while the request is in flight', async () => {
    const onSubmit = vi.fn(() => new Promise<void>(() => {}))
    render(<ExpenseForm onSubmit={onSubmit} />)

    await userEvent.type(screen.getByLabelText('ชื่อรายจ่าย'), 'ข้าวเที่ยง')
    await userEvent.type(screen.getByLabelText('จำนวนเงิน'), '125.50')
    await userEvent.type(screen.getByLabelText('วันที่'), '2026-11-22')
    await userEvent.click(screen.getByRole('button', { name: 'เพิ่มรายจ่าย' }))

    expect(screen.getByRole('button', { name: 'เพิ่มรายจ่าย' })).toBeDisabled()
  })

  it('keeps the field labelled while an error is shown', async () => {
    render(<ExpenseForm onSubmit={vi.fn()} />)

    await userEvent.type(screen.getByLabelText('ชื่อรายจ่าย'), 'ข้าวเที่ยง')
    await userEvent.type(screen.getByLabelText('จำนวนเงิน'), '125.5')
    await userEvent.type(screen.getByLabelText('วันที่'), '2026-11-22')
    await userEvent.click(screen.getByRole('button', { name: 'เพิ่มรายจ่าย' }))

    const amount = screen.getByLabelText('จำนวนเงิน')
    expect(amount).toHaveAttribute('aria-invalid', 'true')
    expect(amount).toHaveAccessibleDescription(/ทศนิยม 2 ตำแหน่ง/)
  })

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
