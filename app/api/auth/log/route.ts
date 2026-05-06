import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Diagnostic-only endpoint: receives client-side breadcrumbs from the auth
// flow (login-success page mostly) so they show up in container logs alongside
// the server-side trail. Cheap to call, no auth, payload size capped.
export async function POST(request: NextRequest) {
  try {
    const raw = await request.text()
    if (raw.length > 4096) {
      console.warn('[client-log] payload too large, dropping', raw.length)
      return NextResponse.json({ ok: false }, { status: 413 })
    }
    const ua = request.headers.get('user-agent')?.slice(0, 80) || '-'
    const ref = request.headers.get('referer')?.slice(0, 100) || '-'
    console.log(`[client-log] ${raw} ua="${ua}" ref="${ref}"`)
  } catch (err) {
    console.error('[client-log] handler error', err)
  }
  return NextResponse.json({ ok: true })
}
