import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://sniperduels.shop'

  // Store referral code in cookie for auto-apply after login
  const cookieStore = await cookies()
  cookieStore.set('referral_code', code.toUpperCase(), {
    maxAge: 30 * 24 * 60 * 60, // 30 days
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })

  return NextResponse.redirect(new URL('/', baseUrl))
}
