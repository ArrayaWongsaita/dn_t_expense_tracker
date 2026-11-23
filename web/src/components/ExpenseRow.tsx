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
