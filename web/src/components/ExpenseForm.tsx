'use client'

import { useId, useState } from 'react'
import type { Expense, ExpenseInput } from '../lib/types'

// กติกาเดียวกับ API (api/src/expenses/dto/expense-fields.schema.ts) —
// ไม่มีศูนย์นำหน้า, จำนวนเต็มไม่เกิน 10 หลัก, และวันที่ต้องมีจริงในปฏิทิน
const AMOUNT_PATTERN = /^(?:0|[1-9]\d{0,9})\.\d{2}$/
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

function isValidDate(value: string): boolean {
  const match = DATE_PATTERN.exec(value)
  if (match === null) return false
  if (Number(match[1]) < 1) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

interface ExpenseFormProps {
  initial?: Expense
  onSubmit: (input: ExpenseInput) => void | Promise<void>
  onCancel?: () => void
}

export function ExpenseForm({ initial, onSubmit, onCancel }: ExpenseFormProps) {
  const fieldId = useId()
  const [title, setTitle] = useState(initial?.title ?? '')
  const [amount, setAmount] = useState(initial?.amount ?? '')
  const [spentOn, setSpentOn] = useState(initial?.spentOn ?? '')
  const [note, setNote] = useState(initial?.note ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [sending, setSending] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextErrors: Record<string, string> = {}
    const trimmedTitle = title.trim()
    const trimmedNote = note.trim()

    if (trimmedTitle.length === 0) nextErrors.title = 'กรุณากรอกชื่อรายจ่าย'
    if (trimmedTitle.length > 120) nextErrors.title = 'ชื่อรายจ่ายไม่เกิน 120 ตัวอักษร'
    if (!AMOUNT_PATTERN.test(amount) || Number(amount) <= 0) {
      nextErrors.amount = 'จำนวนเงินต้องมีทศนิยม 2 ตำแหน่ง เช่น 125.50'
    }
    if (!isValidDate(spentOn)) {
      nextErrors.spentOn = 'วันที่ต้องอยู่ในรูปแบบ 2026-11-22'
    }
    if (trimmedNote.length > 500) nextErrors.note = 'หมายเหตุไม่เกิน 500 ตัวอักษร'

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSending(true)
    try {
      await onSubmit({
        title: trimmedTitle,
        amount,
        spentOn,
        note: trimmedNote.length === 0 ? null : trimmedNote,
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor={`${fieldId}-title`} className="text-sm">
          ชื่อรายจ่าย
        </label>
        <input
          id={`${fieldId}-title`}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          aria-invalid={errors.title ? true : undefined}
          aria-describedby={errors.title ? `${fieldId}-title-error` : undefined}
          className="rounded border px-2 py-1"
        />
        {errors.title ? (
          <p id={`${fieldId}-title-error`} role="alert" className="text-sm text-red-600">
            {errors.title}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={`${fieldId}-amount`} className="text-sm">
          จำนวนเงิน
        </label>
        <input
          id={`${fieldId}-amount`}
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          inputMode="decimal"
          placeholder="125.50"
          aria-invalid={errors.amount ? true : undefined}
          aria-describedby={errors.amount ? `${fieldId}-amount-error` : undefined}
          className="rounded border px-2 py-1"
        />
        {errors.amount ? (
          <p id={`${fieldId}-amount-error`} role="alert" className="text-sm text-red-600">
            {errors.amount}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={`${fieldId}-spent-on`} className="text-sm">
          วันที่
        </label>
        <input
          id={`${fieldId}-spent-on`}
          value={spentOn}
          onChange={(event) => setSpentOn(event.target.value)}
          placeholder="2026-11-22"
          aria-invalid={errors.spentOn ? true : undefined}
          aria-describedby={errors.spentOn ? `${fieldId}-spent-on-error` : undefined}
          className="rounded border px-2 py-1"
        />
        {errors.spentOn ? (
          <p id={`${fieldId}-spent-on-error`} role="alert" className="text-sm text-red-600">
            {errors.spentOn}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={`${fieldId}-note`} className="text-sm">
          หมายเหตุ
        </label>
        <input
          id={`${fieldId}-note`}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          aria-invalid={errors.note ? true : undefined}
          aria-describedby={errors.note ? `${fieldId}-note-error` : undefined}
          className="rounded border px-2 py-1"
        />
        {errors.note ? (
          <p id={`${fieldId}-note-error`} role="alert" className="text-sm text-red-600">
            {errors.note}
          </p>
        ) : null}
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={sending}
          className="rounded bg-neutral-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
        >
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
