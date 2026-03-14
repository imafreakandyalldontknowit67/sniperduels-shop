import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-dark-900 flex">
      <DashboardSidebar />
      <main className="flex-1 ml-0 md:ml-64 p-4 pt-16 md:pt-8 md:p-8 bg-gradient-to-br from-dark-900 via-dark-900 to-dark-800">
        {children}
      </main>
    </div>
  )
}
