import { NextRequest, NextResponse } from 'next/server'
import { flagAndBlacklist } from '@/lib/blacklist'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Honeypot: looks like a user enumeration API
export async function GET(request: NextRequest) {
  const ip = request.headers.get('cf-connecting-ip') || request.ip || request.headers.get('x-real-ip') || '127.0.0.1'
  const user = await getCurrentUser()
  const userAgent = request.headers.get('user-agent') || undefined

  await flagAndBlacklist({
    ip,
    userId: user?.id,
    reason: 'Accessed honeypot: /api/v1/users',
    endpoint: '/api/v1/users',
    userAgent,
  })

  await new Promise(r => setTimeout(r, 1000))

  // Return convincing fake user list
  return NextResponse.json({
    users: [
      { id: '9281742', name: 'xSniper_Pro', balance: 42.50, joined: '2026-01-15' },
      { id: '1038274', name: 'DuelsKing99', balance: 15.00, joined: '2026-02-03' },
      { id: '7429183', name: 'CrateHunterX', balance: 108.25, joined: '2025-12-20' },
    ],
    total: 847,
    page: 1,
    perPage: 25,
  })
}
