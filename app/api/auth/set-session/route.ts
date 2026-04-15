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
  try {
    const { token } = await request.json()
    if (!token || typeof token !== 'string') {
      console.log('[set-session] Missing token')
      return NextResponse.json({ error: 'Missing token' }, { status: 400 })
    }

    console.log(`[set-session] Received token (${token.length} chars)`)

    // Verify the JWT is valid and signed by us — prevents arbitrary cookie injection
    const { payload } = await jwtVerify(token, SESSION_SECRET)

    // One-time use: prevent replay of token from URL history/logs
    pruneConsumed()
    const jti = payload.jti as string
    if (!jti || consumedJtis.has(jti)) {
      console.log(`[set-session] Token already consumed jti=${jti?.slice(0, 8)}`)
      return NextResponse.json({ error: 'Token already used' }, { status: 400 })
    }
    consumedJtis.add(jti)

    console.log(`[set-session] Setting cookie, jti=${jti.slice(0, 8)}`)
    const response = NextResponse.json({ ok: true })
    response.cookies.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })
    return response
  } catch (err) {
    console.error('[set-session] Error:', err)
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
  }
}
