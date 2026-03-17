import { NextRequest, NextResponse } from 'next/server'
import { flagAndBlacklist, generateCanaryToken, getCanaryUrl } from '@/lib/blacklist'
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

  // Tarpit: slow drip to waste their time
  await new Promise(r => setTimeout(r, 3000))

  // Canary tokens embedded as avatar URLs — if they fetch these, we know they're using the stolen data
  const c1 = generateCanaryToken()
  const c2 = generateCanaryToken()
  const c3 = generateCanaryToken()

  return NextResponse.json({
    users: [
      { id: '9281742', name: 'xSniper_Pro', balance: 42.50, joined: '2026-01-15', avatar: getCanaryUrl(c1) },
      { id: '1038274', name: 'DuelsKing99', balance: 15.00, joined: '2026-02-03', avatar: getCanaryUrl(c2) },
      { id: '7429183', name: 'CrateHunterX', balance: 108.25, joined: '2025-12-20', avatar: getCanaryUrl(c3) },
      { id: '5918372', name: 'GemsTrader', balance: 230.00, joined: '2026-01-28', avatar: null },
      { id: '3047261', name: 'SD_Collector', balance: 67.80, joined: '2026-02-14', avatar: null },
    ],
    total: 847,
    page: 1,
    perPage: 25,
  })
}
