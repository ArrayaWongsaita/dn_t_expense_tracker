import { callBackend, passThrough, setSessionCookie } from '../../../../lib/backend'

export async function POST(request: Request) {
  const body = await request.json()
  const response = await callBackend('/auth/login', { method: 'POST', body: JSON.stringify(body) })
  if (!response.ok) return passThrough(response)

  const { accessToken, expiresIn } = await response.json()
  await setSessionCookie(accessToken, expiresIn)
  return Response.json({ ok: true })
}
