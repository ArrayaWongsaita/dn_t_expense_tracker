'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ApiError, signup } from '../../lib/api-client'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (password.length < 12) {
      setError('รหัสผ่านอย่างน้อย 12 ตัวอักษร')
      return
    }
    setSending(true)
    setError(null)
    try {
      await signup(email, password)
      router.push('/expenses')
    } catch (cause) {
      setError(
        cause instanceof ApiError && cause.status === 409
          ? 'อีเมลนี้ถูกใช้แล้ว'
          : 'สมัครไม่สำเร็จ กรุณาลองใหม่',
      )
    } finally {
      setSending(false)
    }
  }

  return (
    <main className="mx-auto w-full max-w-sm p-6">
      <h1 className="mb-6 text-xl font-semibold">สมัครสมาชิก</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm">อีเมล</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className="rounded border px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm">รหัสผ่าน</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            className="rounded border px-2 py-1"
          />
          <span className="text-xs text-neutral-500">อย่างน้อย 12 ตัวอักษร</span>
        </label>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={sending}
          className="rounded bg-neutral-900 px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          สมัครสมาชิก
        </button>
      </form>
      <p className="mt-4 text-sm text-neutral-500">
        มีบัญชีแล้ว?{' '}
        <Link href="/login" className="underline">
          เข้าสู่ระบบ
        </Link>
      </p>
    </main>
  )
}
