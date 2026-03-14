import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { getStockItem, updateStockItem, deleteStockItem } from '@/lib/storage'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const item = await getStockItem(id)

  if (!item) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 })
  }

  const response = NextResponse.json(item)
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
  response.headers.set('Pragma', 'no-cache')
  return response
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await request.json()

    // Sanitize text fields to prevent stored XSS
    const stripHtml = (s: unknown) => typeof s === 'string' ? s.replace(/<[^>]*>/g, '') : undefined

    // Strip immutable/dangerous fields that must not be overwritten
    const { id: _id, createdAt: _ca, updatedAt: _ua, __proto__: _p, ...safeBody } = body

    const sanitized: Record<string, unknown> = { ...safeBody }
    if ('name' in safeBody) {
      const name = stripHtml(safeBody.name) || safeBody.name
      if (typeof name === 'string' && name.length > 200) {
        return NextResponse.json({ error: 'Name must be under 200 characters' }, { status: 400 })
      }
      sanitized.name = name
    }
    if ('description' in safeBody) {
      const desc = stripHtml(safeBody.description) ?? ''
      if (typeof desc === 'string' && desc.length > 2000) {
        return NextResponse.json({ error: 'Description must be under 2000 characters' }, { status: 400 })
      }
      sanitized.description = desc
    }
    if ('stock' in safeBody) sanitized.stock = Math.max(0, Math.floor(Number(safeBody.stock) || 0))
    if ('priceUsd' in safeBody) {
      const price = Number(safeBody.priceUsd)
      if (!Number.isFinite(price) || price < 0) {
        return NextResponse.json({ error: 'priceUsd must be a non-negative number' }, { status: 400 })
      }
      sanitized.priceUsd = Math.round(price * 100) / 100
    }
    if ('imageUrl' in safeBody) {
      const url = String(safeBody.imageUrl || '')
      if (url && !url.startsWith('https://')) {
        return NextResponse.json({ error: 'imageUrl must be an HTTPS URL' }, { status: 400 })
      }
      sanitized.imageUrl = url || undefined
    }

    const item = await updateStockItem(id, sanitized)

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    return NextResponse.json(item)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const success = await deleteStockItem(id)

  if (!success) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
