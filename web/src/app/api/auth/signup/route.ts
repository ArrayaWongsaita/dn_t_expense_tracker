import { callBackend, passThrough, setSessionCookie } from '../../../../lib/backend'

export async function POST(request: Request) {
  const body = await request.json()
  const signup = await callBackend('/auth/signup', { method: 'POST', body: JSON.stringify(body) })
  if (!signup.ok) return passThrough(signup)

  const login = await callBackend('/auth/login', { method: 'POST', body: JSON.stringify(body) })
  if (!login.ok) return passThrough(login)

  const { accessToken, expiresIn } = await login.json()
  await setSessionCookie(accessToken, expiresIn)
  return Response.json({ ok: true }, { status: 201 })
}
