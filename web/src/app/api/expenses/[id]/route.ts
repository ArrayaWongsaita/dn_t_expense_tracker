import { callBackend, passThrough } from '../../../../lib/backend'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.json()
  return passThrough(
    await callBackend(`/expenses/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  )
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return passThrough(await callBackend(`/expenses/${id}`, { method: 'DELETE' }))
}
