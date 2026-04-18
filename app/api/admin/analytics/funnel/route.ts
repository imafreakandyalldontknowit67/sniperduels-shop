import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { queryFunnel } from '@/lib/posthog-api'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const dateFrom = searchParams.get('dateFrom') || '-7d'
  const dateTo = searchParams.get('dateTo') || undefined
  const type = searchParams.get('type') || 'items'

  try {
    const steps = type === 'gems'
      ? ['$pageview', 'gems_buy_clicked', 'gems_confirm_modal_opened', 'terms_agreed', 'gems_purchased']
      : type === 'deposits'
      ? ['deposit_page_viewed', 'deposit_initiated', 'checkout_modal_opened', 'deposit_completed']
      : ['$pageview', 'item_buy_clicked', 'item_purchased']

    const data = await queryFunnel(steps, { dateFrom, dateTo })
    return NextResponse.json(data)
  } catch (error) {
    console.error('PostHog funnel query failed:', error)
    return NextResponse.json({ error: 'Failed to fetch funnel' }, { status: 502 })
  }
}
