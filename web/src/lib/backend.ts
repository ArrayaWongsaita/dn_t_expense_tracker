// ใช้ได้เฉพาะฝั่งเซิร์ฟเวอร์ (route handler / server component) เพราะเรียก next/headers
// ห้าม import จาก client component
import { cookies } from 'next/headers'

export const ACCESS_TOKEN_COOKIE = 'access_token'

const API_URL = process.env.API_URL ?? 'http://127.0.0.1:3000'

export async function getAccessToken(): Promise<string | null> {
  const store = await cookies()
  return store.get(ACCESS_TOKEN_COOKIE)?.value ?? null
}

export async function callBackend(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken()
  const headers = new Headers(init.headers)
  headers.set('content-type', 'application/json')
  if (token) headers.set('authorization', `Bearer ${token}`)

  return fetch(`${API_URL}${path}`, { ...init, headers, cache: 'no-store' })
}

export async function passThrough(response: Response): Promise<Response> {
  if (response.status === 401) await clearSessionCookie()
  if (response.status === 204) return new Response(null, { status: 204 })
  const body = await response.text()
  return new Response(body, {
    status: response.status,
    headers: { 'content-type': 'application/json' },
  })
}

export async function setSessionCookie(accessToken: string, maxAge: number): Promise<void> {
  const store = await cookies()
  store.set(ACCESS_TOKEN_COOKIE, accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge,
    secure: process.env.NODE_ENV === 'production',
  })
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies()
  store.delete(ACCESS_TOKEN_COOKIE)
}
