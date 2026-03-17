import { NextRequest, NextResponse } from 'next/server'
import { flagAndBlacklist } from '@/lib/blacklist'
import { getCurrentUser, isAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Honeypot: looks like a data export endpoint. Uses tarpit streaming.
export async function GET(request: NextRequest) {
  const ip = request.headers.get('cf-connecting-ip') || request.ip || request.headers.get('x-real-ip') || '127.0.0.1'
  const user = await getCurrentUser()
  const userAgent = request.headers.get('user-agent') || undefined

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

  // Tarpit: drip fake CSV data slowly over 30 seconds
  const stream = new ReadableStream({
    async start(controller) {
      const lines = [
        'id,username,email,balance,created_at\n',
        '1001,xSniper_Pro,xsniper@email.com,42.50,2026-01-15\n',
        '1002,DuelsKing99,duelking@email.com,15.00,2026-02-03\n',
        '1003,CrateHunterX,cratehunter@email.com,108.25,2025-12-20\n',
        '1004,GemsTrader,gems@email.com,230.00,2026-01-28\n',
        '1005,SD_Collector,collector@email.com,67.80,2026-02-14\n',
        '# Export complete. 847 records.\n',
      ]
      for (const line of lines) {
        controller.enqueue(new TextEncoder().encode(line))
        await new Promise(r => setTimeout(r, 4000)) // 4s per line = ~28s total
      }
      controller.close()
    },
  })

  return new NextResponse(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="users_export.csv"',
    },
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

  await new Promise(r => setTimeout(r, 5000))

  return NextResponse.json({
    status: 'queued',
    exportId: `exp_${Date.now()}`,
    message: 'Export started. Check back in a few minutes.',
  })
}
