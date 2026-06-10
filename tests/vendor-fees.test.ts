import { describe, it, expect } from 'vitest'
import {
  tierRateForVolume,
  effectiveFeeRate,
  computeNextTierState,
  DEFAULT_FEE_RATE,
  DISCOUNT_RATE,
  THRESHOLD_K,
  GRACE_DAYS,
} from '../lib/vendor-fees'

const DAY = 86_400_000
const t0 = new Date('2026-06-01T00:00:00.000Z')
const plus = (d: number) => new Date(t0.getTime() + d * DAY)

describe('tierRateForVolume', () => {
  it('is 3% below the threshold and 1.5% at/above it', () => {
    expect(tierRateForVolume(0)).toBe(DEFAULT_FEE_RATE)
    expect(tierRateForVolume(THRESHOLD_K - 1)).toBe(DEFAULT_FEE_RATE)
    expect(tierRateForVolume(THRESHOLD_K)).toBe(DISCOUNT_RATE)
    expect(tierRateForVolume(THRESHOLD_K * 10)).toBe(DISCOUNT_RATE)
  })
})

describe('effectiveFeeRate precedence (manual > auto > default)', () => {
  it('manual override wins', () => {
    expect(effectiveFeeRate({ platformFeeRate: 0.02, autoFeeRate: 0.015 })).toBe(0.02)
  })
  it('falls back to auto when no manual', () => {
    expect(effectiveFeeRate({ platformFeeRate: null, autoFeeRate: 0.015 })).toBe(0.015)
  })
  it('defaults to 3% when neither is set', () => {
    expect(effectiveFeeRate({ platformFeeRate: null, autoFeeRate: null })).toBe(DEFAULT_FEE_RATE)
    expect(effectiveFeeRate(null)).toBe(DEFAULT_FEE_RATE)
    expect(effectiveFeeRate(undefined)).toBe(DEFAULT_FEE_RATE)
  })
  it('coerces Decimal-as-string values', () => {
    expect(effectiveFeeRate({ platformFeeRate: '0.025' })).toBe(0.025)
    expect(effectiveFeeRate({ autoFeeRate: '0.015' })).toBe(0.015)
  })
})

describe('computeNextTierState — grace hysteresis', () => {
  it('earns the discount immediately when volume hits the threshold', () => {
    const r = computeNextTierState({ autoFeeRate: DEFAULT_FEE_RATE, feeTierBelowSince: null }, 700, t0)
    expect(r.autoFeeRate).toBe(DISCOUNT_RATE)
    expect(r.feeTierBelowSince).toBeNull()
    expect(r.inGrace).toBe(false)
  })

  it('earns from a never-evaluated state', () => {
    const r = computeNextTierState({ autoFeeRate: null, feeTierBelowSince: null }, THRESHOLD_K, t0)
    expect(r.autoFeeRate).toBe(DISCOUNT_RATE)
  })

  it('stays at default while below threshold and not discounted', () => {
    const r = computeNextTierState({ autoFeeRate: DEFAULT_FEE_RATE, feeTierBelowSince: null }, 100, t0)
    expect(r.autoFeeRate).toBe(DEFAULT_FEE_RATE)
    expect(r.feeTierBelowSince).toBeNull()
    expect(r.inGrace).toBe(false)
  })

  it('starts the grace clock the first day a discounted vendor dips below', () => {
    const r = computeNextTierState({ autoFeeRate: DISCOUNT_RATE, feeTierBelowSince: null }, 100, t0)
    expect(r.autoFeeRate).toBe(DISCOUNT_RATE) // keeps discount
    expect(r.feeTierBelowSince).toEqual(t0)
    expect(r.inGrace).toBe(true)
    expect(r.graceEndsAt).toEqual(plus(GRACE_DAYS))
  })

  it('keeps the discount while inside the grace window', () => {
    const r = computeNextTierState({ autoFeeRate: DISCOUNT_RATE, feeTierBelowSince: t0 }, 100, plus(GRACE_DAYS - 1))
    expect(r.autoFeeRate).toBe(DISCOUNT_RATE)
    expect(r.feeTierBelowSince).toEqual(t0) // clock unchanged
    expect(r.inGrace).toBe(true)
  })

  it('reverts to default once the grace window has fully elapsed', () => {
    const r = computeNextTierState({ autoFeeRate: DISCOUNT_RATE, feeTierBelowSince: t0 }, 100, plus(GRACE_DAYS))
    expect(r.autoFeeRate).toBe(DEFAULT_FEE_RATE)
    expect(r.feeTierBelowSince).toBeNull()
    expect(r.inGrace).toBe(false)
  })

  it('re-qualifying mid-grace clears the clock and keeps the discount', () => {
    const r = computeNextTierState({ autoFeeRate: DISCOUNT_RATE, feeTierBelowSince: t0 }, 800, plus(3))
    expect(r.autoFeeRate).toBe(DISCOUNT_RATE)
    expect(r.feeTierBelowSince).toBeNull()
    expect(r.inGrace).toBe(false)
  })
})
