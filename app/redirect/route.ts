import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { exchangeCodeForTokens, getRobloxUserInfo, createSession, isAdmin, isAccountTooYoung, validateOAuthState, retrieveCodeVerifier, getSession } from '@/lib/auth'
import { upsertUser } from '@/lib/storage'
import { applyReferralCode } from '@/lib/referral'

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
  const stateResult = await validateOAuthState('roblox', state)

  if (stateResult === 'consumed') {
    // Duplicate callback (browser prefetch/bfcache) — wait briefly for first request to finish
    await new Promise(r => setTimeout(r, 1500))
    const existingSession = await getSession()
    if (existingSession) {
      return NextResponse.redirect(new URL('/', baseUrl))
    }
    console.error('[Auth] State consumed but no session found', { state: state?.slice(0, 8) })
    return NextResponse.redirect(new URL('/?error=invalid_state', baseUrl))
  }

  if (stateResult === 'invalid') {
    // Check if already logged in (e.g. user hit back button after successful login)
    const existingSession = await getSession()
    if (existingSession) {
      return NextResponse.redirect(new URL('/', baseUrl))
    }
    console.error('[Auth] Invalid state', { hasState: !!state, state: state?.slice(0, 8) })
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

    // Auto-apply referral code from cookie (set by /r/[code] link)
    const referralCode = cookieStore.get('referral_code')?.value
    if (referralCode) {
      cookieStore.delete('referral_code')
      applyReferralCode(user.id, referralCode).catch(err =>
        console.error('[Referral] Auto-apply failed:', err)
      )
    }

    // Redirect all users to home (admins can access admin panel via header link)
    return NextResponse.redirect(new URL('/', baseUrl))
  } catch (error) {
    console.error('Auth callback error:', error)
    return NextResponse.redirect(new URL('/?error=auth_failed', baseUrl))
  }
}
