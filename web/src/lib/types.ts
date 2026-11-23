export interface Expense {
  id: string
  title: string
  amount: string
  spentOn: string
  note: string | null
  createdAt: string
  updatedAt: string
}

export interface ExpenseInput {
  title: string
  amount: string
  spentOn: string
  note: string | null
}
