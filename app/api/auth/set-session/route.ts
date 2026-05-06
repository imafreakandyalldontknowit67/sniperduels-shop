import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

export const dynamic = 'force-dynamic'

const SESSION_SECRET = new TextEncoder().encode(process.env.SESSION_SECRET)

// One-time use: track consumed JTIs so the token URL can't be replayed
const consumedJtis = new Set<string>()
// Prevent unbounded memory growth — prune every 5 min
let lastPrune = Date.now()
function pruneConsumed() {
  const now = Date.now()
  if (now - lastPrune > 5 * 60_000) {
    consumedJtis.clear() // JWTs older than 5 min are stale anyway
    lastPrune = now
  }
}

// Called by /login-success page to set the session cookie via a same-origin POST.
// This avoids Safari ITP stripping Set-Cookie from cross-origin redirect responses.
// The token is validated (signed JWT) so it can't be forged.
export async function POST(request: NextRequest) {
  const ua = request.headers.get('user-agent')?.slice(0, 60) || '-'
  console.log(`[set-session] entered ua="${ua}"`)
  try {
    const { token } = await request.json()
    if (!token || typeof token !== 'string') {
      console.error(`[set-session] FAIL stage=missing_token ua="${ua}"`)
      return NextResponse.json({ error: 'Missing token' }, { status: 400 })
    }

    console.log(`[set-session] step=token_received len=${token.length}`)

    // Verify the JWT is valid and signed by us — prevents arbitrary cookie injection
    let payload
    try {
      ;({ payload } = await jwtVerify(token, SESSION_SECRET))
    } catch (verifyErr) {
      console.error(`[set-session] FAIL stage=jwt_verify err=${String(verifyErr)} token_prefix=${token.slice(0, 20)}`)
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
    }
    console.log(`[set-session] step=jwt_verified jti=${(payload.jti as string)?.slice(0, 8)} sub=${payload.sub}`)

    // One-time use: prevent replay of token from URL history/logs
    pruneConsumed()
    const jti = payload.jti as string
    if (!jti || consumedJtis.has(jti)) {
      console.error(`[set-session] FAIL stage=jti_replay jti=${jti?.slice(0, 8)} sub=${payload.sub}`)
      return NextResponse.json({ error: 'Token already used' }, { status: 400 })
    }
    consumedJtis.add(jti)

    const isProd = process.env.NODE_ENV === 'production'
    console.log(`[set-session] step=setting_cookie jti=${jti.slice(0, 8)} secure=${isProd} sub=${payload.sub}`)
    const response = NextResponse.json({ ok: true })
    response.cookies.set('session', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })
    console.log(`[set-session] step=ok jti=${jti.slice(0, 8)} sub=${payload.sub}`)
    return response
  } catch (err) {
    console.error(`[set-session] FAIL stage=outer_exception err=${String(err)} stack=${(err as Error)?.stack?.slice(0, 400)}`)
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
  }
}
