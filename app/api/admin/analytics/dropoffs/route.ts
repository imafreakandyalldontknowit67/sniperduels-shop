import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { queryEvents } from '@/lib/posthog-api'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const dateFrom = searchParams.get('dateFrom') || '-7d'
  const dateTo = searchParams.get('dateTo') || undefined

  try {
    const data = await queryEvents('$pageleave', 1000, { dateFrom, dateTo })

    const pageCounts: Record<string, { exits: number; url: string }> = {}
    for (const event of data.results || []) {
      const url = event.properties?.$current_url || 'unknown'
      const path = new URL(url, 'https://sniperduels.shop').pathname
      if (!pageCounts[path]) {
        pageCounts[path] = { exits: 0, url: path }
      }
      pageCounts[path].exits++
    }

    const sorted = Object.values(pageCounts).sort((a, b) => b.exits - a.exits)
    return NextResponse.json({ pages: sorted })
  } catch (error) {
    console.error('PostHog dropoff query failed:', error)
    return NextResponse.json({ error: 'Failed to fetch dropoffs' }, { status: 502 })
  }
}
