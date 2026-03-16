import { NextResponse } from 'next/server'
import { getActiveStock } from '@/lib/storage'

export const dynamic = 'force-dynamic'

export async function GET() {
  const stock = await getActiveStock()
  return NextResponse.json(stock, {
    headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
  })
}
