import { callBackend, passThrough } from '../../../lib/backend'

export async function GET() {
  return passThrough(await callBackend('/expenses?limit=100'))
}

export async function POST(request: Request) {
  const body = await request.json()
  return passThrough(await callBackend('/expenses', { method: 'POST', body: JSON.stringify(body) }))
}
