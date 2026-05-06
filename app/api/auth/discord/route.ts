import { NextRequest, NextResponse } from 'next/server'
import { getDiscordAuthUrl, getCurrentUser, storeOAuthState, isAllowedOAuthReason } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // Ensure user is logged in first
  const user = await getCurrentUser()
  if (!user) {
    // Preserve the reason param so that after Roblox login the user is sent
    // back to /api/auth/discord with the same intent.
    const reasonParam = request.nextUrl.searchParams.get('reason')
    const errorUrl = new URL('/?error=not_logged_in', process.env.NEXT_PUBLIC_BASE_URL)
    if (reasonParam && isAllowedOAuthReason(reasonParam)) {
      errorUrl.searchParams.set('discord_reason', reasonParam)
    }
    return NextResponse.redirect(errorUrl)
  }

  const reasonRaw = request.nextUrl.searchParams.get('reason')
  const reason = isAllowedOAuthReason(reasonRaw) ? reasonRaw : undefined

  const { state, codeChallenge } = await storeOAuthState('discord', { reason })
  const authUrl = getDiscordAuthUrl(state, codeChallenge)
  return NextResponse.redirect(authUrl)
}
