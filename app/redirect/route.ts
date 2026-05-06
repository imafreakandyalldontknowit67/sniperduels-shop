import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { exchangeCodeForTokens, getRobloxUserInfo, createSession, isAdmin, isAccountTooYoung, validateOAuthState, retrieveCodeVerifier, getSession } from '@/lib/auth'
import { upsertUser } from '@/lib/storage'
import { applyReferralCode } from '@/lib/referral'
import { captureServerEvent } from '@/lib/posthog-api'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const state = searchParams.get('state')
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  const userAgent = request.headers.get('user-agent') || 'unknown'

  // Refuse to handle the OAuth flow on speculative loads (browser prefetch,
  // link-preview agents, antivirus URL scanners, Discord/Slack unfurlers).
  // If we let those run, they consume the OAuthState row and complete the
  // exchange — but their responses (redirect to /login-success) are discarded,
  // so the cookie never gets set. The user's real navigation then sees a
  // consumed state, falls through, and lands logged out.
  // Headers covered:
  //   Sec-Purpose: prefetch | prefetch;prerender         (Chrome, Firefox 100+)
  //   Purpose: prefetch                                  (older Chrome, Safari)
  //   X-Purpose: prefetch | preview                      (older Safari)
  //   X-moz: prefetch                                    (older Firefox)
  const secPurpose = request.headers.get('sec-purpose') || ''
  const purpose = request.headers.get('purpose') || request.headers.get('x-purpose') || request.headers.get('x-moz') || ''
  const isPrefetch = /prefetch|prerender|preview/i.test(secPurpose) || /prefetch|preview/i.test(purpose)
  if (isPrefetch) {
    console.log(`[Auth] Prefetch refused | sec-purpose="${secPurpose}" purpose="${purpose}" ua="${userAgent.slice(0, 60)}"`)
    return new NextResponse(null, { status: 204 })
  }

  // Diagnostic: log the navigation context. Most important for debugging is
  // sec-fetch-site (cross-site = legit OAuth callback from Roblox) vs
  // (same-origin / none) which would suggest a speculative load.
  console.log(
    `[Auth] /redirect entry | state=${state?.slice(0, 8)} ` +
    `sec-fetch-site=${request.headers.get('sec-fetch-site') || '-'} ` +
    `sec-fetch-dest=${request.headers.get('sec-fetch-dest') || '-'} ` +
    `sec-fetch-mode=${request.headers.get('sec-fetch-mode') || '-'} ` +
    `referer=${request.headers.get('referer')?.slice(0, 80) || '-'}`
  )

  // Track callback received
  captureServerEvent('anonymous', 'login_callback_received', {
    has_code: !!code,
    has_state: !!state,
    has_error: !!error,
    user_agent: userAgent,
  })

  if (error) {
    console.error('OAuth error:', error)
    captureServerEvent('anonymous', 'login_failed', { reason: 'oauth_denied', error, user_agent: userAgent })
    return NextResponse.redirect(new URL('/?error=oauth_denied', baseUrl))
  }

  if (!code) {
    captureServerEvent('anonymous', 'login_failed', { reason: 'no_code', user_agent: userAgent })
    return NextResponse.redirect(new URL('/?error=no_code', baseUrl))
  }

  // Validate OAuth state to prevent CSRF
  const stateResult = await validateOAuthState('roblox', state)

  console.log(`[Auth] /redirect stateResult=${stateResult} state=${state?.slice(0, 8)}`)

  if (stateResult === 'consumed') {
    console.log(`[Auth] /redirect duplicate-callback redirect→/ state=${state?.slice(0, 8)}`)
    return NextResponse.redirect(new URL('/', baseUrl))
  }

  if (stateResult === 'invalid') {
    const existingSession = await getSession()
    if (existingSession) {
      console.log(`[Auth] /redirect invalid-state but session exists redirect→/ state=${state?.slice(0, 8)}`)
      return NextResponse.redirect(new URL('/', baseUrl))
    }
    console.error(`[Auth] FAIL stage=invalid_state state=${state?.slice(0, 8)} hasState=${!!state}`)
    captureServerEvent('anonymous', 'login_failed', { reason: 'invalid_state', user_agent: userAgent })
    return NextResponse.redirect(new URL('/?error=invalid_state', baseUrl))
  }

  // Retrieve PKCE code verifier (and any payload set during initiation,
  // currently unused on Roblox login but reserved for B1 buy-intent resume).
  const stateMeta = await retrieveCodeVerifier('roblox', state)
  if (!stateMeta) {
    console.error(`[Auth] FAIL stage=no_code_verifier state=${state?.slice(0, 8)}`)
    captureServerEvent('anonymous', 'login_failed', { reason: 'no_code_verifier', user_agent: userAgent })
    return NextResponse.redirect(new URL('/?error=auth_failed', baseUrl))
  }
  const { codeVerifier } = stateMeta

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code, codeVerifier, baseUrl)
    if (!tokens) {
      console.error(`[Auth] FAIL stage=token_exchange_failed state=${state?.slice(0, 8)} code_len=${code?.length}`)
      captureServerEvent('anonymous', 'login_failed', { reason: 'token_exchange_failed', user_agent: userAgent })
      return NextResponse.redirect(new URL('/?error=token_exchange_failed', baseUrl))
    }

    // Get user info
    const user = await getRobloxUserInfo(tokens.access_token)
    if (!user) {
      console.error(`[Auth] FAIL stage=user_info_failed state=${state?.slice(0, 8)} access_token_len=${tokens.access_token?.length}`)
      captureServerEvent('anonymous', 'login_failed', { reason: 'user_info_failed', user_agent: userAgent })
      return NextResponse.redirect(new URL('/?error=auth_failed', baseUrl))
    }

    // Check account age (must be at least 30 days old)
    // Use same generic error to prevent user enumeration
    if (user.robloxCreatedAt && isAccountTooYoung(user.robloxCreatedAt)) {
      console.error(`[Auth] FAIL stage=account_too_young user=${user.id} created=${user.robloxCreatedAt}`)
      captureServerEvent(user.id, 'login_failed', { reason: 'account_too_young', user_agent: userAgent })
      return NextResponse.redirect(new URL('/?error=auth_failed', baseUrl))
    }
    console.log(`[Auth] /redirect step=user_info_ok user=${user.id} name=${user.name} created=${user.robloxCreatedAt}`)

    // Store user in our database
    const userIsAdmin = isAdmin(user.id)
    console.log(`[Auth] /redirect step=upsert_user_start user=${user.id} admin=${userIsAdmin}`)
    try {
      await upsertUser({
        id: user.id,
        name: user.name,
        displayName: user.displayName,
        avatar: user.avatar,
        robloxCreatedAt: user.robloxCreatedAt,
        isAdmin: userIsAdmin,
      })
      console.log(`[Auth] /redirect step=upsert_user_ok user=${user.id}`)
    } catch (upsertErr) {
      console.error(`[Auth] /redirect step=upsert_user_fail user=${user.id} err=${String(upsertErr)}`)
      throw upsertErr
    }

    // Create session (tokens are NOT stored — only needed for the exchange above)
    console.log(`[Auth] /redirect step=create_session_start user=${user.id} expires_in=${tokens.expires_in}`)
    const sessionToken = await createSession({
      user,
      expiresAt: Date.now() + tokens.expires_in * 1000,
    })
    console.log(`[Auth] /redirect step=create_session_ok user=${user.id} token_len=${sessionToken?.length}`)

    // Auto-apply referral code from cookie (set by /r/[code] link)
    const cookieStore = await cookies()
    const referralCode = cookieStore.get('referral_code')?.value
    if (referralCode) {
      console.log(`[Auth] /redirect step=referral_apply user=${user.id} code=${referralCode.slice(0, 8)}`)
      applyReferralCode(user.id, referralCode).catch(err =>
        console.error('[Referral] Auto-apply failed:', err)
      )
    }

    captureServerEvent(user.id, 'login_completed', {
      roblox_username: user.name,
      user_agent: userAgent,
    })

    // Redirect to intermediate page that sets the cookie via same-origin fetch.
    // Safari ITP strips Set-Cookie from redirect responses in cross-origin chains
    // (Roblox OAuth → our domain), so we can't set it here directly.
    // The token is a signed JWT — /login-success verifies it before setting.
    const successUrl = new URL('/login-success', baseUrl)
    successUrl.searchParams.set('token', sessionToken)
    const response = NextResponse.redirect(successUrl)

    // Also delete referral cookie on the redirect response
    if (referralCode) {
      response.cookies.delete('referral_code')
    }

    console.log(`[Auth] /redirect step=redirect_to_login_success user=${user.id} url=${successUrl.pathname}`)
    return response
  } catch (error) {
    console.error(`[Auth] FAIL stage=exception state=${state?.slice(0, 8)} err=${String(error)} stack=${(error as Error)?.stack?.slice(0, 500)}`)
    captureServerEvent('anonymous', 'login_failed', { reason: 'exception', error: String(error), user_agent: userAgent })
    return NextResponse.redirect(new URL('/?error=auth_failed', baseUrl))
  }
}
