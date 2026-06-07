import { getCurrentUser } from '@/lib/auth'
import { getUser } from '@/lib/storage'
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar'
import OutageBanner from '@/components/OutageBanner'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  // TEMP PREVIEW BYPASS: allow unauthenticated access to dashboard pages on this
  // rough-draft branch so the deposit checkout UX can be reviewed locally.
  // Restore the redirect before shipping.

  const dbUser = user ? await getUser(user.id) : null

  return (
    <div className="min-h-screen bg-dark-900 flex">
      <DashboardSidebar isVendor={dbUser?.isVendor ?? false} />
      <main className="flex-1 ml-0 md:ml-64 p-4 pt-16 md:pt-8 md:p-8 bg-gradient-to-br from-dark-900 via-dark-900 to-dark-800">
        <OutageBanner surface="dashboard" />
        {children}
      </main>
    </div>
  )
}
