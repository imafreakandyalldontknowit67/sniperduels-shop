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
  const { itemsComingSoon } = body

  if (typeof itemsComingSoon !== 'boolean') {
    return NextResponse.json({ error: 'itemsComingSoon must be a boolean' }, { status: 400 })
  }

  const settings = await updateSiteSettings({ itemsComingSoon })
  return NextResponse.json(settings)
}
