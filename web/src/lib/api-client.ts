// ชั้นนี้คุยกับ /api ของเว็บ ถ้าจะเขียนเทสต้อง mock fetch ซึ่ง repo นี้ตั้งใจเลี่ยง
// ตรรกะที่ควรมีเทสจึงถูกแยกไป lib/format.ts และ lib/expenses.ts แทน
import type { Expense, ExpenseInput } from './types'

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function readMessage(response: Response): Promise<string> {
  const body = await response.json().catch(() => null)
  const message = body?.message
  if (Array.isArray(message)) return message.join(', ')
  if (typeof message === 'string') return message
  return 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง'
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { 'content-type': 'application/json', ...init.headers },
  })
  if (!response.ok) throw new ApiError(await readMessage(response), response.status)
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export function listExpenses(): Promise<Expense[]> {
  return request<Expense[]>('/api/expenses')
}

export function createExpense(input: ExpenseInput): Promise<Expense> {
  return request<Expense>('/api/expenses', { method: 'POST', body: JSON.stringify(input) })
}

export function updateExpense(id: string, input: ExpenseInput): Promise<Expense> {
  return request<Expense>(`/api/expenses/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
}

export function deleteExpense(id: string): Promise<void> {
  return request<void>(`/api/expenses/${id}`, { method: 'DELETE' })
}

export function login(email: string, password: string): Promise<void> {
  return request<void>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function signup(email: string, password: string): Promise<void> {
  return request<void>('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function logout(): Promise<void> {
  return request<void>('/api/auth/logout', { method: 'POST' })
}
