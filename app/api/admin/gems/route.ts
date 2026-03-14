import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { getGemStock, setGemStock } from '@/lib/storage'

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

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { balanceInK } = body

    if (typeof balanceInK !== 'number' || balanceInK < 0) {
      return NextResponse.json(
        { error: 'balanceInK must be a non-negative number' },
        { status: 400 }
      )
    }

    const newBalance = await setGemStock(Math.round(balanceInK))
    return NextResponse.json({ balanceInK: newBalance })
  } catch {
    return NextResponse.json({ error: 'Failed to update gem stock' }, { status: 500 })
  }
}
