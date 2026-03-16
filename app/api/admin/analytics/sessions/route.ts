import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { queryTrend } from '@/lib/posthog-api'

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
    const data = await queryTrend(['$pageview'], { dateFrom, dateTo })
    return NextResponse.json(data)
  } catch (error) {
    console.error('PostHog sessions query failed:', error)
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 502 })
  }
}
