import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { ensureReferralCode, getReferralStats } from '@/lib/referral'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id
  const code = await ensureReferralCode(userId)
  const stats = await getReferralStats(userId)

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://sniperduels.shop'

  return NextResponse.json({
    referralCode: code,
    referralUrl: `${baseUrl}/r/${code}`,
    ...stats,
  })
}
