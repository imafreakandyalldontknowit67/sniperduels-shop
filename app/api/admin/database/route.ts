import { NextRequest, NextResponse } from 'next/server'
import { flagAndBlacklist } from '@/lib/blacklist'
import { getCurrentUser } from '@/lib/auth'
import { isAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Honeypot: looks like a database access endpoint
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
    reason: 'Accessed honeypot: /api/admin/database',
    endpoint: '/api/admin/database',
    userAgent,
  })

  await new Promise(r => setTimeout(r, 2000))

  return NextResponse.json({
    tables: ['users', 'orders', 'deposits', 'stock_items'],
    totalRecords: 14823,
    lastBackup: new Date(Date.now() - 86400000).toISOString(),
    status: 'healthy',
  })
}
