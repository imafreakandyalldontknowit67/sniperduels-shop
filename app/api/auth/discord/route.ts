import { NextResponse } from 'next/server'
import { getDiscordAuthUrl, getCurrentUser, storeOAuthState } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  // Ensure user is logged in first
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.redirect(new URL('/?error=not_logged_in', process.env.NEXT_PUBLIC_BASE_URL))
  }

  const { state, codeChallenge } = await storeOAuthState('discord')
  const authUrl = getDiscordAuthUrl(state, codeChallenge)
  return NextResponse.redirect(authUrl)
}
