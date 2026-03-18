import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getUser } from '@/lib/storage'
import { VendorSidebar } from '@/components/vendor/VendorSidebar'

export default async function VendorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/')
  }

  const dbUser = await getUser(user.id)
  if (!dbUser?.isVendor) {
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-dark-900 flex">
      <VendorSidebar />
      <main className="flex-1 ml-0 md:ml-64 p-4 md:p-8 pt-14 md:pt-8 bg-gradient-to-br from-dark-900 via-dark-900 to-dark-800">
        {children}
      </main>
    </div>
  )
}
