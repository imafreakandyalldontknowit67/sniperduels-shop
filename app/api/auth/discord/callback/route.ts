import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, exchangeDiscordCodeForTokens, getDiscordUserInfo, validateOAuthState, retrieveCodeVerifier, addUserToGuild } from '@/lib/auth'
import { linkDiscordToUser } from '@/lib/storage'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const state = searchParams.get('state')

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

  // Check if user is logged in
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.redirect(new URL('/?error=not_logged_in', baseUrl))
  }

  if (error) {
    console.error('Discord OAuth error:', error)
    return NextResponse.redirect(new URL('/dashboard/profile?discord=error', baseUrl))
  }

  if (!code) {
    return NextResponse.redirect(new URL('/dashboard/profile?discord=error', baseUrl))
  }

  // Validate OAuth state to prevent CSRF
  const stateResult = await validateOAuthState('discord', state)
  if (stateResult !== 'valid') {
    return NextResponse.redirect(new URL(`/dashboard/profile?discord=${stateResult === 'consumed' ? 'linked' : 'invalid_state'}`, baseUrl))
  }

  // Retrieve PKCE code verifier
  const codeVerifier = await retrieveCodeVerifier('discord', state)
  if (!codeVerifier) {
    return NextResponse.redirect(new URL('/dashboard/profile?discord=error', baseUrl))
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeDiscordCodeForTokens(code, codeVerifier)
    if (!tokens) {
      return NextResponse.redirect(new URL('/dashboard/profile?discord=error', baseUrl))
    }

    // Get Discord user info
    const discordUser = await getDiscordUserInfo(tokens.access_token)
    if (!discordUser) {
      return NextResponse.redirect(new URL('/dashboard/profile?discord=error', baseUrl))
    }

    // Link Discord to user account
    const linked = await linkDiscordToUser(user.id, {
      id: discordUser.id,
      username: discordUser.username,
      avatar: discordUser.avatar,
    })
    if (!linked) {
      // Discord account already linked to a different website user.
      return NextResponse.redirect(new URL('/dashboard/profile?discord=conflict', baseUrl))
    }

    // Auto-join user to Discord server (non-blocking — link succeeds even if this fails)
    await addUserToGuild(tokens.access_token, discordUser.id)

    return NextResponse.redirect(new URL('/dashboard/profile?discord=linked', baseUrl))
  } catch (error) {
    console.error('Discord callback error:', error)
    return NextResponse.redirect(new URL('/dashboard/profile?discord=error', baseUrl))
  }
}
