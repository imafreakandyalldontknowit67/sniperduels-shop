import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { applyReferralCode } from '@/lib/referral'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const code = body.code
  if (!code || typeof code !== 'string') {
    return NextResponse.json({ error: 'Referral code is required.' }, { status: 400 })
  }

  const result = await applyReferralCode(session.user.id, code)
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
