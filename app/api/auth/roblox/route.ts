import { NextResponse } from 'next/server'
import { getRobloxAuthUrl, storeOAuthState } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { state, codeChallenge } = await storeOAuthState('roblox')
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  const authUrl = getRobloxAuthUrl(state, codeChallenge, baseUrl)
  return NextResponse.redirect(authUrl)
}
