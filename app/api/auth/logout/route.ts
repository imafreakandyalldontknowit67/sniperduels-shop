import { NextResponse } from 'next/server'
import { invalidateCurrentSession } from '@/lib/auth'

export async function POST() {
  await invalidateCurrentSession()

  const response = NextResponse.json({ success: true })
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
  response.headers.set('Pragma', 'no-cache')
  return response
}
