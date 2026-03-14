import { NextResponse } from 'next/server'
import { getSiteSettings } from '@/lib/storage'

export async function GET() {
  const settings = await getSiteSettings()
  return NextResponse.json(settings)
}
