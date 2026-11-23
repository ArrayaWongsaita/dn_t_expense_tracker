import { redirect } from 'next/navigation'
import { ExpensesScreen } from '../../components/ExpensesScreen'
import { getAccessToken } from '../../lib/backend'

export default async function ExpensesPage() {
  const token = await getAccessToken()
  if (token === null) redirect('/login')
  return <ExpensesScreen />
}
