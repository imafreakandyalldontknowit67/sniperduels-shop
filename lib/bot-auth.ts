/**
 * Shared bot-side auth helper (x-bot-api-key header, timing-safe compare).
 */
import type { NextRequest } from 'next/server'
import { timingSafeEqual } from 'crypto'

export function authenticateBot(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-bot-api-key')
  if (!apiKey || !process.env.BOT_API_KEY) return false
  try {
    return timingSafeEqual(
      Buffer.from(apiKey),
      Buffer.from(process.env.BOT_API_KEY),
    )
  } catch {
    return false
  }
}
