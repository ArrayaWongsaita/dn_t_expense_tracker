'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ExpenseForm } from './ExpenseForm'
import { ExpenseList } from './ExpenseList'
import { SummaryBar } from './SummaryBar'
import { logout } from '../lib/api-client'
import { filterByMonth, monthOf, sumCents } from '../lib/expenses'
import { formatAmount } from '../lib/format'
import { useExpenses } from '../lib/use-expenses'
import type { Expense, ExpenseInput } from '../lib/types'

export function ExpensesScreen() {
  const router = useRouter()
  const { expenses, loading, error, reload, create, update, remove } = useExpenses()
  const [month, setMonth] = useState(() => monthOf(new Date()))
  const [editing, setEditing] = useState<Expense | null>(null)
  const [adding, setAdding] = useState(false)

  const visible = filterByMonth(expenses, month)

  async function handleCreate(input: ExpenseInput) {
    if (await create(input)) setAdding(false)
  }

  async function handleUpdate(id: string, input: ExpenseInput) {
    if (await update(id, input)) setEditing(null)
  }

  function handleDelete(id: string) {
    if (window.confirm('ลบรายจ่ายรายการนี้?')) void remove(id)
  }

  async function handleLogout() {
    await logout()
    router.push('/login')
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">รายจ่าย</h1>
        <div className="flex items-center gap-2">
          <input
            type="month"
            aria-label="เดือน"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            className="rounded border px-2 py-1"
          />
          <button
            type="button"
            onClick={handleLogout}
            className="rounded border px-3 py-1 text-sm"
          >
            ออกจากระบบ
          </button>
        </div>
      </header>

      <SummaryBar total={formatAmount(sumCents(visible))} count={visible.length} />

      {loading ? <p className="text-neutral-500">กำลังโหลด…</p> : null}

      {error ? (
        <div className="flex items-center justify-between rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          <span>{error}</span>
          <button type="button" onClick={() => void reload()} className="rounded border px-2 py-1">
            ลองใหม่
          </button>
        </div>
      ) : null}

      {adding ? (
        <ExpenseForm onSubmit={handleCreate} onCancel={() => setAdding(false)} />
      ) : (
        <button
          type="button"
          onClick={() => {
            setEditing(null)
            setAdding(true)
          }}
          className="self-start rounded bg-neutral-900 px-3 py-1.5 text-sm text-white"
        >
          เพิ่มรายจ่าย
        </button>
      )}

      {editing ? (
        <ExpenseForm
          key={editing.id}
          initial={editing}
          onSubmit={(input) => handleUpdate(editing.id, input)}
          onCancel={() => setEditing(null)}
        />
      ) : null}

      <ExpenseList
        expenses={visible}
        onEdit={(expense) => {
          setAdding(false)
          setEditing(expense)
        }}
        onDelete={handleDelete}
        emptyText="ยังไม่มีรายจ่ายในเดือนนี้"
      />
    </main>
  )
}
