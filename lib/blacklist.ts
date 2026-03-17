import { prisma } from './prisma'

const HONEYPOT_WEBHOOK = 'https://discord.com/api/webhooks/1483389312052498494/ITYxYA-ZWjsEP9YsoaubfdpmHN2JnG34-zwXw7s5q5m4aMiLn8Ni5_PNjNHdGr1nsuGP'

// In-memory cache of blacklisted IPs (refreshed every 5 min)
let blacklistedIps = new Set<string>()
let blacklistedUserIds = new Set<string>()
let lastRefresh = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export async function refreshBlacklistCache(): Promise<void> {
  const now = Date.now()
  if (now - lastRefresh < CACHE_TTL) return
  lastRefresh = now

  try {
    const entries = await prisma.blacklist.findMany({
      select: { ip: true, userId: true },
    })

    const ips = new Set<string>()
    const userIds = new Set<string>()

    for (const entry of entries) {
      if (entry.ip) ips.add(entry.ip)
      if (entry.userId) userIds.add(entry.userId)
    }

    blacklistedIps = ips
    blacklistedUserIds = userIds
  } catch (err) {
    console.error('[Blacklist] Failed to refresh cache:', err)
  }
}

export function isIpBlacklisted(ip: string): boolean {
  return blacklistedIps.has(ip)
}

export function isUserBlacklisted(userId: string): boolean {
  return blacklistedUserIds.has(userId)
}

export async function flagAndBlacklist(opts: {
  ip: string
  userId?: string
  reason: string
  endpoint: string
  userAgent?: string
}): Promise<void> {
  const { ip, userId, reason, endpoint, userAgent } = opts

  // Add to DB
  try {
    await prisma.blacklist.create({
      data: { ip, userId, reason, endpoint, userAgent },
    })
  } catch {
    // May already exist, that's fine
  }

  // Immediately update in-memory cache
  blacklistedIps.add(ip)
  if (userId) blacklistedUserIds.add(userId)

  // Sync with middleware's in-memory blacklist (middleware runs in Edge, can't access Prisma)
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const params = new URLSearchParams({ ip, secret: process.env.SESSION_SECRET || '' })
    await fetch(`${baseUrl}/api/internal/blacklist-sync?${params}`)
  } catch {
    // Non-critical
  }

  // Send Discord alert
  try {
    await fetch(HONEYPOT_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: 'Honeypot Triggered',
          color: 0xff0000,
          fields: [
            { name: 'IP', value: ip || 'unknown', inline: true },
            { name: 'User ID', value: userId || 'unauthenticated', inline: true },
            { name: 'Endpoint', value: endpoint, inline: false },
            { name: 'Reason', value: reason, inline: false },
            { name: 'User-Agent', value: (userAgent || 'none').slice(0, 200), inline: false },
          ],
          timestamp: new Date().toISOString(),
        }],
      }),
    })
  } catch {
    // Non-critical
  }
}
