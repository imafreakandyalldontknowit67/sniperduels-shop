/**
 * Vendor-facing fee status: their current effective rate, this-week gem volume,
 * the source (manual vs auto tier), and progress toward / grace status of the
 * 650k volume break. Read-only; safe to poll.
 */
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getUser } from '@/lib/storage'
import { prisma } from '@/lib/prisma'
import {
  computeRolling7dVolumeK,
  effectiveFeeRate,
  THRESHOLD_K,
  DISCOUNT_RATE,
  DEFAULT_FEE_RATE,
} from '@/lib/vendor-fees'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const dbUser = await getUser(user.id)
    if (!dbUser?.isVendor) return NextResponse.json({ error: 'Not a vendor' }, { status: 403 })

    const listing = await prisma.vendorGemListing.findUnique({
      where: { vendorId: user.id },
      select: { platformFeeRate: true, autoFeeRate: true, feeTierBelowSince: true },
    })

    // Live headline number (cached field can be up to a day stale).
    const volumeK = await computeRolling7dVolumeK(user.id)
    const effectiveRate = effectiveFeeRate(listing)
    const source = listing?.platformFeeRate != null ? 'manual' : 'auto'

    const discounted = effectiveRate <= DISCOUNT_RATE
    const qualifies = volumeK >= THRESHOLD_K
    const inGrace =
      source === 'auto' && discounted && !qualifies && listing?.feeTierBelowSince != null
    const graceEndsAt = inGrace
      ? new Date(new Date(listing!.feeTierBelowSince!).getTime() + 7 * 86_400_000).toISOString()
      : null

    return NextResponse.json({
      effectiveRate,                       // e.g. 0.015
      source,                              // 'manual' | 'auto'
      volume7dK: volumeK,                  // gems sold (k) last 7 days
      thresholdK: THRESHOLD_K,             // 650
      discountRate: DISCOUNT_RATE,         // 0.015
      defaultRate: DEFAULT_FEE_RATE,       // 0.03
      qualifies,                           // at/over threshold right now
      remainingToThresholdK: Math.max(0, THRESHOLD_K - volumeK),
      inGrace,                             // discounted but currently below threshold
      graceEndsAt,                         // when the discount reverts if volume stays low
    })
  } catch (error) {
    console.error('Vendor fee-status GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch fee status' }, { status: 500 })
  }
}
