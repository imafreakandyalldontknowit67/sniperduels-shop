import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { exchangeCodeForTokens, getRobloxUserInfo, createSession, isAdmin, isAccountTooYoung, validateOAuthState, retrieveCodeVerifier } from '@/lib/auth'
import { upsertUser } from '@/lib/storage'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const state = searchParams.get('state')
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

  if (error) {
    console.error('OAuth error:', error)
    return NextResponse.redirect(new URL('/?error=oauth_denied', baseUrl))
  }

  if (!code) {
    return NextResponse.redirect(new URL('/?error=no_code', baseUrl))
  }

  // Validate OAuth state to prevent CSRF
  const validState = await validateOAuthState('roblox', state)
  if (!validState) {
    return NextResponse.redirect(new URL('/?error=invalid_state', baseUrl))
  }

  // Retrieve PKCE code verifier
  const codeVerifier = await retrieveCodeVerifier('roblox')
  if (!codeVerifier) {
    return NextResponse.redirect(new URL('/?error=auth_failed', baseUrl))
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code, codeVerifier, baseUrl)
    if (!tokens) {
      return NextResponse.redirect(new URL('/?error=token_exchange_failed', baseUrl))
    }

    // Get user info
    const user = await getRobloxUserInfo(tokens.access_token)
    if (!user) {
      return NextResponse.redirect(new URL('/?error=auth_failed', baseUrl))
    }

    // Check account age (must be at least 30 days old)
    // Use same generic error to prevent user enumeration
    if (user.robloxCreatedAt && isAccountTooYoung(user.robloxCreatedAt)) {
      return NextResponse.redirect(new URL('/?error=auth_failed', baseUrl))
    }

    // Store user in our database
    const userIsAdmin = isAdmin(user.id)
    await upsertUser({
      id: user.id,
      name: user.name,
      displayName: user.displayName,
      avatar: user.avatar,
      robloxCreatedAt: user.robloxCreatedAt,
      isAdmin: userIsAdmin,
    })

    // Create session (tokens are NOT stored — only needed for the exchange above)
    const sessionToken = await createSession({
      user,
      expiresAt: Date.now() + tokens.expires_in * 1000,
    })

    // Set cookie
    const cookieStore = await cookies()
    cookieStore.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })

    // Redirect all users to home (admins can access admin panel via header link)
    return NextResponse.redirect(new URL('/', baseUrl))
  } catch (error) {
    console.error('Auth callback error:', error)
    return NextResponse.redirect(new URL('/?error=auth_failed', baseUrl))
  }
}
