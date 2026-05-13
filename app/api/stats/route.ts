import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const result = await prisma.order.aggregate({
    where: { type: 'gems', status: 'completed' },
    _sum: { quantity: true },
  })

  const itemsDeliveredK = result._sum.quantity ?? 0

  return NextResponse.json(
    { itemsDeliveredK },
    { headers: { 'Cache-Control': 'public, s-maxage=300' } },
  )
}
