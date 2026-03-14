import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { getStock, createStockItem, RARITIES, FX_EFFECTS, FRAGTRAK_TYPES } from '@/lib/storage'

const VALID_TYPES = ['sniper', 'knife', 'crate'] as const

export async function GET() {
  const user = await getCurrentUser()
  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const stock = await getStock()
  const response = NextResponse.json(stock)
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
  response.headers.set('Pragma', 'no-cache')
  return response
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()

    // Sanitize text inputs — strip HTML tags to prevent stored XSS
    const stripHtml = (s: unknown) => typeof s === 'string' ? s.replace(/<[^>]*>/g, '') : ''

    const name = stripHtml(body.name)
    if (!name || name.length > 200) {
      return NextResponse.json({ error: 'Name is required and must be under 200 characters' }, { status: 400 })
    }

    const description = stripHtml(body.description)
    if (description && description.length > 2000) {
      return NextResponse.json({ error: 'Description must be under 2000 characters' }, { status: 400 })
    }

    const priceUsd = Number(body.priceUsd)
    if (!Number.isFinite(priceUsd) || priceUsd < 0) {
      return NextResponse.json({ error: 'priceUsd must be a non-negative number' }, { status: 400 })
    }

    // Validate enum fields
    if (!VALID_TYPES.includes(body.type)) {
      return NextResponse.json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` }, { status: 400 })
    }
    if (body.rarity && !RARITIES.includes(body.rarity)) {
      return NextResponse.json({ error: `Invalid rarity` }, { status: 400 })
    }
    if (body.fx && !FX_EFFECTS.includes(body.fx)) {
      return NextResponse.json({ error: `Invalid fx effect` }, { status: 400 })
    }
    if (body.fragtrak && !FRAGTRAK_TYPES.includes(body.fragtrak)) {
      return NextResponse.json({ error: `Invalid fragtrak type` }, { status: 400 })
    }

    const item = await createStockItem({
      name,
      type: body.type,
      description: description || '',
      priceUsd: Math.round(priceUsd * 100) / 100,
      stock: Math.max(0, Math.floor(Number(body.stock) || 0)),
      rarity: body.rarity || undefined,
      fx: body.fx || undefined,
      fragtrak: body.fragtrak || undefined,
      active: body.active ?? true,
    })

    return NextResponse.json(item)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create item' }, { status: 500 })
  }
}
