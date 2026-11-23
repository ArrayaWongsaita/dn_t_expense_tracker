import { clearSessionCookie } from '../../../../lib/backend'

export async function POST() {
  await clearSessionCookie()
  return new Response(null, { status: 204 })
}
