import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getUser } from '@/lib/storage'
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/')

  const dbUser = await getUser(user.id)

  return (
    <div className="min-h-screen bg-dark-900 flex">
      <DashboardSidebar isVendor={dbUser?.isVendor ?? false} />
      <main className="flex-1 ml-0 md:ml-64 p-4 pt-16 md:pt-8 md:p-8 bg-gradient-to-br from-dark-900 via-dark-900 to-dark-800">
        {children}
      </main>
    </div>
  )
}
