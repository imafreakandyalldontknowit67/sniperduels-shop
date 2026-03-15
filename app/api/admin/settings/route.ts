import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { getSiteSettings, updateSiteSettings } from '@/lib/storage'

export async function GET() {
  const user = await getCurrentUser()
  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const settings = await getSiteSettings()
  return NextResponse.json(settings)
}

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const update: Record<string, boolean> = {}

  if (typeof body.itemsComingSoon === 'boolean') update.itemsComingSoon = body.itemsComingSoon
  if (typeof body.depositsDisabled === 'boolean') update.depositsDisabled = body.depositsDisabled

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No valid settings provided' }, { status: 400 })
  }

  const settings = await updateSiteSettings(update)
  return NextResponse.json(settings)
}
