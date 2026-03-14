import { NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { getGemStock } from '@/lib/storage'

export async function GET() {
  const user = await getCurrentUser()
  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const balanceInK = await getGemStock()

  return NextResponse.json({ balanceInK }, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
