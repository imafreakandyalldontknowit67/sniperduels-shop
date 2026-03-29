import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { getFinanceStats, getLedgerEntries } from '@/lib/storage'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !isAdmin(user.id)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const period = (searchParams.get('period') || 'all') as 'today' | 'week' | 'month' | 'all'

    const [stats, recentTransactions] = await Promise.all([
      getFinanceStats(period),
      getLedgerEntries({ limit: 50 }),
    ])

    return NextResponse.json({ stats, recentTransactions })
  } catch (error) {
    console.error('Finance stats error:', error)
    return NextResponse.json({ error: 'Failed to fetch finance stats' }, { status: 500 })
  }
}
