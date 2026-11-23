import type { Expense } from './types'

export function monthKey(spentOn: string): string {
  return spentOn.slice(0, 7)
}

// ใช้ปฏิทินท้องถิ่น (getFullYear/getMonth) ไม่ใช่ toISOString() เพราะผู้ใช้อยู่ UTC+7
// ถ้าใช้ UTC วันที่ 1 เวลา 00:00–07:00 จะถูกมองว่าเป็นเดือนก่อนหน้า
export function monthOf(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function filterByMonth(expenses: Expense[], month: string): Expense[] {
  return expenses.filter((expense) => monthKey(expense.spentOn) === month)
}

// เก็บเงินเป็น "สตางค์" (จำนวนเต็ม) เพราะ 0.1 + 0.2 = 0.30000000000000004
// ถ้าบวกทศนิยมตรง ๆ ยอดรวมจะเพี้ยน — ดูเทส "adds cents without floating point drift"
export function toCents(amount: string): number {
  return Math.round(Number(amount) * 100)
}

export function sumCents(expenses: Expense[]): number {
  return expenses.reduce((total, expense) => total + toCents(expense.amount), 0)
}
