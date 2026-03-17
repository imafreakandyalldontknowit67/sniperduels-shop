import { NextRequest, NextResponse } from 'next/server'
import { flagAndBlacklist } from '@/lib/blacklist'
import { getCurrentUser } from '@/lib/auth'
import { isAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Honeypot: looks like a data export endpoint
export async function GET(request: NextRequest) {
  const ip = request.headers.get('cf-connecting-ip') || request.ip || request.headers.get('x-real-ip') || '127.0.0.1'
  const user = await getCurrentUser()
  const userAgent = request.headers.get('user-agent') || undefined

  // Real admins get a 404 — this endpoint doesn't actually exist
  if (user && isAdmin(user.id)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await flagAndBlacklist({
    ip,
    userId: user?.id,
    reason: 'Accessed honeypot: /api/admin/export',
    endpoint: '/api/admin/export',
    userAgent,
  })

  // Fake delayed response to look real
  await new Promise(r => setTimeout(r, 1500))

  return NextResponse.json({
    status: 'processing',
    message: 'Export queued. You will receive an email when ready.',
    estimatedTime: '2-3 minutes',
  })
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('cf-connecting-ip') || request.ip || request.headers.get('x-real-ip') || '127.0.0.1'
  const user = await getCurrentUser()
  const userAgent = request.headers.get('user-agent') || undefined

  if (user && isAdmin(user.id)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await flagAndBlacklist({
    ip,
    userId: user?.id,
    reason: 'POST to honeypot: /api/admin/export',
    endpoint: '/api/admin/export',
    userAgent,
  })

  await new Promise(r => setTimeout(r, 2000))

  return NextResponse.json({
    status: 'queued',
    exportId: `exp_${Date.now()}`,
    message: 'Export started. Check back in a few minutes.',
  })
}
