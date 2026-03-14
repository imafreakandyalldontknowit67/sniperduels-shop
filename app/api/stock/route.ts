import { NextResponse } from 'next/server'
import { getActiveStock } from '@/lib/storage'

export async function GET() {
  const stock = await getActiveStock()
  return NextResponse.json(stock)
}
