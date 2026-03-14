import { redirect } from 'next/navigation'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { AdminSidebar } from '@/components/admin/AdminSidebar'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  if (!user || !isAdmin(user.id)) {
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-dark-900 flex">
      <AdminSidebar />
      <main className="flex-1 ml-64 p-8 bg-gradient-to-br from-dark-900 via-dark-900 to-dark-800">
        {children}
      </main>
    </div>
  )
}
