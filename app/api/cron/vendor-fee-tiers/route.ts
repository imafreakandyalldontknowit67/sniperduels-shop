/**
 * Cron: recompute every active vendor's volume-based fee tier.
 *
 * Run daily. Handles the DOWNGRADE side of the tier system — volume decays with
 * no sale event to trigger it, so this advances each vendor's grace clock and
 * reverts them to 3% once they've been below 650k/wk for a full week. Upgrades
 * are also handled here for completeness (instant upgrades additionally fire on
 * each sale via createVendorEarning). Manual-override vendors are left untouched
 * (their volume cache is still refreshed for the admin display).
 *
 * Auth: x-cron-secret header.
 */
import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { recomputeAllVendorTiers } from '@/lib/vendor-fees'

function authenticateCron(request: NextRequest): boolean {
  const secret = request.headers.get('x-cron-secret')
  if (!secret || !process.env.CRON_SECRET) return false
  try {
    return timingSafeEqual(Buffer.from(secret), Buffer.from(process.env.CRON_SECRET))
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  if (!authenticateCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results = await recomputeAllVendorTiers()
  const changed = results.filter(r => r.changed)

  return NextResponse.json({
    ok: true,
    evaluated: results.length,
    changedCount: changed.length,
    changes: changed.map(r => ({
      vendorId: r.vendorId,
      from: r.fromRate,
      to: r.toRate,
      volumeK: r.volumeK,
      inGrace: r.inGrace,
      graceEndsAt: r.graceEndsAt,
    })),
  })
}

export async function GET(request: NextRequest) {
  return POST(request)
}
