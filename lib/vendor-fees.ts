/**
 * Volume-based vendor fee tiers.
 *
 * Effective fee rate on a vendor gem sale = manual override (platformFeeRate)
 * ?? auto volume tier (autoFeeRate) ?? DEFAULT 3%.
 *
 * The auto tier is driven by rolling 7-day gem volume with a 1-week grace:
 *   - hit the 650k/wk threshold -> drop to 1.5% immediately
 *   - keep it while volume holds
 *   - only revert to 3% after staying below 650k for GRACE_DAYS straight days
 *
 * Manual overrides win: if an admin set platformFeeRate, the auto tier never
 * touches that vendor's rate (recompute only refreshes their volume cache).
 *
 * Volume is measured in gems "k" (Order.quantity is already in k-units, so a
 * 650k-gem sale is quantity 650). Order.vendorListingId stores the vendorId.
 */
import { prisma } from './prisma'

export const DEFAULT_FEE_RATE = 0.03
export const DISCOUNT_RATE = 0.015
export const THRESHOLD_K = 650
export const ROLLING_WINDOW_DAYS = 7
export const GRACE_DAYS = 7
const DAY_MS = 86_400_000

/** Tier table — ascending by minK. Pick the highest tier whose minK <= volume.
 *  Two tiers today; add rows here to deepen the ladder, no other code changes. */
export const FEE_TIERS: ReadonlyArray<{ minK: number; rate: number }> = [
  { minK: 0, rate: DEFAULT_FEE_RATE },
  { minK: THRESHOLD_K, rate: DISCOUNT_RATE },
]

export function tierRateForVolume(volumeK: number): number {
  let rate = FEE_TIERS[0].rate
  for (const t of FEE_TIERS) if (volumeK >= t.minK) rate = t.rate
  return rate
}

/** Coerce a number | string | Prisma.Decimal | null to a finite number or null. */
function toNum(v: unknown): number | null {
  if (v == null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/** Resolve the fee rate actually charged: manual override > auto tier > default.
 *  Accepts Prisma Decimal, string, or number for the rate fields. */
export function effectiveFeeRate(
  listing: { platformFeeRate?: unknown; autoFeeRate?: unknown } | null | undefined,
): number {
  if (!listing) return DEFAULT_FEE_RATE
  const manual = toNum(listing.platformFeeRate)
  if (manual != null) return manual
  const auto = toNum(listing.autoFeeRate)
  if (auto != null) return auto
  return DEFAULT_FEE_RATE
}

/** Sum of a vendor's completed gem sales (in k) over the rolling window. */
export async function computeRolling7dVolumeK(
  vendorId: string,
  now: Date = new Date(),
): Promise<number> {
  const since = new Date(now.getTime() - ROLLING_WINDOW_DAYS * DAY_MS).toISOString()
  const agg = await prisma.order.aggregate({
    _sum: { quantity: true },
    where: {
      vendorListingId: vendorId,
      type: 'gems',
      status: 'completed',
      createdAt: { gte: since }, // ISO-8601 UTC strings sort chronologically
    },
  })
  return agg._sum.quantity ?? 0
}

export interface TierState {
  autoFeeRate: number | null
  feeTierBelowSince: Date | null
}
export interface NextTierState {
  autoFeeRate: number
  feeTierBelowSince: Date | null
  inGrace: boolean
  graceEndsAt: Date | null
}

/**
 * Pure hysteresis state machine (no DB) — the heart of the grace logic, kept
 * pure so it's deterministically unit-testable. Given the prior auto-tier state
 * and current rolling volume, decide the next auto rate + grace clock.
 *   - volume >= threshold        -> discount immediately, clear grace
 *   - below + not discounted     -> default rate
 *   - below + discounted, in grace window -> keep discount, clock running
 *   - below + discounted, grace expired   -> revert to default
 */
export function computeNextTierState(
  prev: TierState,
  volumeK: number,
  now: Date,
): NextTierState {
  if (volumeK >= THRESHOLD_K) {
    return { autoFeeRate: DISCOUNT_RATE, feeTierBelowSince: null, inGrace: false, graceEndsAt: null }
  }
  const currentlyDiscounted = prev.autoFeeRate != null && prev.autoFeeRate <= DISCOUNT_RATE
  if (!currentlyDiscounted) {
    return { autoFeeRate: DEFAULT_FEE_RATE, feeTierBelowSince: null, inGrace: false, graceEndsAt: null }
  }
  const belowSince = prev.feeTierBelowSince ?? now // start the clock on first sub-threshold eval
  const graceEnd = new Date(belowSince.getTime() + GRACE_DAYS * DAY_MS)
  if (now.getTime() >= graceEnd.getTime()) {
    return { autoFeeRate: DEFAULT_FEE_RATE, feeTierBelowSince: null, inGrace: false, graceEndsAt: null }
  }
  return { autoFeeRate: DISCOUNT_RATE, feeTierBelowSince: belowSince, inGrace: true, graceEndsAt: graceEnd }
}

export interface TierResult {
  vendorId: string
  skipped?: 'manual' | 'no-listing'
  volumeK: number
  fromRate: number | null
  toRate: number
  changed: boolean
  inGrace: boolean
  graceEndsAt: string | null
}

/**
 * Recompute one vendor's auto fee tier with grace hysteresis. Pure-ish: pass
 * `now` for deterministic tests. Skips vendors with a manual override (only
 * refreshes their cached volume). Idempotent.
 */
export async function recomputeVendorTier(
  vendorId: string,
  now: Date = new Date(),
): Promise<TierResult> {
  const listing = await prisma.vendorGemListing.findUnique({
    where: { vendorId },
    select: { platformFeeRate: true, autoFeeRate: true, feeTierBelowSince: true },
  })
  if (!listing) {
    return {
      vendorId, skipped: 'no-listing', volumeK: 0,
      fromRate: null, toRate: DEFAULT_FEE_RATE, changed: false,
      inGrace: false, graceEndsAt: null,
    }
  }

  const volumeK = await computeRolling7dVolumeK(vendorId, now)
  const fromRate = listing.autoFeeRate != null ? Number(listing.autoFeeRate) : null

  // Manual override wins — don't touch the rate, just refresh the volume cache.
  if (listing.platformFeeRate != null) {
    await prisma.vendorGemListing.update({
      where: { vendorId },
      data: { rolling7dVolumeK: volumeK, feeTierEvaluatedAt: now },
    })
    return {
      vendorId, skipped: 'manual', volumeK,
      fromRate, toRate: Number(listing.platformFeeRate), changed: false,
      inGrace: false, graceEndsAt: null,
    }
  }

  const next = computeNextTierState(
    {
      autoFeeRate: listing.autoFeeRate != null ? Number(listing.autoFeeRate) : null,
      feeTierBelowSince: listing.feeTierBelowSince,
    },
    volumeK,
    now,
  )

  await prisma.vendorGemListing.update({
    where: { vendorId },
    data: {
      autoFeeRate: next.autoFeeRate,
      feeTierBelowSince: next.feeTierBelowSince,
      feeTierEvaluatedAt: now,
      rolling7dVolumeK: volumeK,
    },
  })

  return {
    vendorId, volumeK, fromRate, toRate: next.autoFeeRate,
    changed: fromRate !== next.autoFeeRate, inGrace: next.inGrace,
    graceEndsAt: next.graceEndsAt ? next.graceEndsAt.toISOString() : null,
  }
}

/** Recompute every active vendor's tier (daily cron). Best-effort per vendor. */
export async function recomputeAllVendorTiers(now: Date = new Date()): Promise<TierResult[]> {
  const listings = await prisma.vendorGemListing.findMany({
    where: { active: true },
    select: { vendorId: true },
  })
  const results: TierResult[] = []
  for (const l of listings) {
    try {
      results.push(await recomputeVendorTier(l.vendorId, now))
    } catch (e) {
      console.error(`[fee-tiers] recompute failed for vendor ${l.vendorId}:`, e)
    }
  }
  return results
}
