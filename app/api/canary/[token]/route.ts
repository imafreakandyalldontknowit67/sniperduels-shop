import { NextRequest, NextResponse } from 'next/server'
import { handleCanaryHit } from '@/lib/blacklist'

export const dynamic = 'force-dynamic'

// Canary token endpoint — if anyone accesses this URL, they got it from fake honeypot data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const ip = request.headers.get('cf-connecting-ip') || request.ip || request.headers.get('x-real-ip') || '127.0.0.1'
  const userAgent = request.headers.get('user-agent') || undefined

  await handleCanaryHit(token, ip, userAgent)

  // Return a tiny transparent 1x1 PNG (looks like an image/avatar to the attacker)
  const pixel = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  )
  return new NextResponse(pixel, {
    status: 200,
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' },
  })
}
