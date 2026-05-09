import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const currentUser = await getCurrentUser()
  if (!currentUser || !isAdmin(currentUser.id)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const q = (request.nextUrl.searchParams.get('q') || '').trim()
  const vendorsOnly = request.nextUrl.searchParams.get('vendorsOnly') !== 'false'

  if (!q) {
    return NextResponse.json({ results: [] })
  }

  const where: any = {
    OR: [
      { name: { contains: q, mode: 'insensitive' } },
      { displayName: { contains: q, mode: 'insensitive' } },
      { id: { equals: q } },
      { discordUsername: { contains: q, mode: 'insensitive' } },
      { discordId: { equals: q } },
    ],
  }
  if (vendorsOnly) where.isVendor = true

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      displayName: true,
      avatar: true,
      walletBalance: true,
      isVendor: true,
      discordUsername: true,
    },
    orderBy: [{ walletBalance: 'desc' }],
    take: 20,
  })

  return NextResponse.json({
    results: users.map(u => ({
      id: u.id,
      name: u.name,
      displayName: u.displayName,
      avatar: u.avatar,
      walletBalance: Number(u.walletBalance),
      isVendor: u.isVendor,
      discordUsername: u.discordUsername,
    })),
  })
}
