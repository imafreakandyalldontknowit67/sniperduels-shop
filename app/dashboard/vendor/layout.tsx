import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getUser } from '@/lib/storage'

export default async function VendorGuardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/')

  const dbUser = await getUser(user.id)
  if (!dbUser?.isVendor) redirect('/dashboard')

  return <>{children}</>
}
