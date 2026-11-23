'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ApiError,
  createExpense,
  deleteExpense,
  listExpenses,
  updateExpense,
} from './api-client'
import type { Expense, ExpenseInput } from './types'

function messageFor(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 400) return 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง'
    if (error.status === 404) return 'ไม่พบรายจ่ายนี้'
    return error.message
  }
  return 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่'
}

export function useExpenses() {
  const router = useRouter()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const handleFailure = useCallback(
    (cause: unknown) => {
      if (cause instanceof ApiError && cause.status === 401) {
        router.replace('/login')
        return
      }
      setError(messageFor(cause))
    },
    [router],
  )

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      setExpenses(await listExpenses())
      setError(null)
    } catch (cause) {
      handleFailure(cause)
    } finally {
      setLoading(false)
    }
  }, [handleFailure])

  useEffect(() => {
    let active = true

    listExpenses()
      .then((list) => {
        if (!active) return
        setExpenses(list)
        setError(null)
      })
      .catch((cause) => {
        if (active) handleFailure(cause)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [handleFailure])

  const create = useCallback(
    async (input: ExpenseInput): Promise<boolean> => {
      try {
        await createExpense(input)
        await reload()
        return true
      } catch (cause) {
        handleFailure(cause)
        return false
      }
    },
    [reload, handleFailure],
  )

  const update = useCallback(
    async (id: string, input: ExpenseInput): Promise<boolean> => {
      try {
        await updateExpense(id, input)
        await reload()
        return true
      } catch (cause) {
        if (cause instanceof ApiError && cause.status === 404) {
          await reload()
          setError('ไม่พบรายจ่ายนี้')
        } else {
          handleFailure(cause)
        }
        return false
      }
    },
    [reload, handleFailure],
  )

  const remove = useCallback(
    async (id: string) => {
      try {
        await deleteExpense(id)
        await reload()
      } catch (cause) {
        if (cause instanceof ApiError && cause.status === 404) {
          await reload()
          setError('ไม่พบรายจ่ายนี้')
        } else {
          handleFailure(cause)
        }
      }
    },
    [reload, handleFailure],
  )

  return { expenses, loading, error, reload, create, update, remove }
}
