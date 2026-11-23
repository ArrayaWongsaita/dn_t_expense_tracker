import { ExpenseRow } from './ExpenseRow'
import type { Expense } from '../lib/types'

interface ExpenseListProps {
  expenses: Expense[]
  onEdit: (expense: Expense) => void
  onDelete: (id: string) => void
  emptyText: string
}

export function ExpenseList({ expenses, onEdit, onDelete, emptyText }: ExpenseListProps) {
  if (expenses.length === 0) {
    return <p className="py-8 text-center text-neutral-500">{emptyText}</p>
  }

  return (
    <ul>
      {expenses.map((expense) => (
        <ExpenseRow key={expense.id} expense={expense} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </ul>
  )
}
