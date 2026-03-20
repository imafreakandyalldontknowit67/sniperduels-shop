import { NextResponse } from 'next/server'
import { getActiveVendorListings, getGemStock } from '@/lib/storage'

// Platform's own pricing tiers
const PLATFORM_TIERS = [
  { min: 1, max: 99, rate: 2.90 },
  { min: 100, max: 500, rate: 2.65 },
]

export async function GET() {
  try {
    const [vendorListings, platformStockK] = await Promise.all([
      getActiveVendorListings(),
      getGemStock(),
    ])

    // Build vendor listings for the frontend
    const listings = vendorListings.map(l => ({
      id: l.id,
      vendorId: l.vendorId,
      pricePerK: l.pricePerK,
      minOrderK: l.minOrderK,
      maxOrderK: l.maxOrderK,
      stockK: l.stockK,
      bulkTiers: l.bulkTiers,
      type: 'vendor' as const,
    }))

    // Add platform listing
    const platformListing = {
      id: 'platform',
      vendorId: null,
      pricePerK: PLATFORM_TIERS[0].rate,
      minOrderK: 5,
      maxOrderK: 500,
      stockK: platformStockK,
      bulkTiers: PLATFORM_TIERS.map(t => ({ minK: t.min, pricePerK: t.rate })),
      type: 'platform' as const,
    }

    // Combine and sort cheapest first
    const allListings = [platformListing, ...listings].sort((a, b) => a.pricePerK - b.pricePerK)

    return NextResponse.json({ listings: allListings })
  } catch (error) {
    console.error('Gem listings GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch listings' }, { status: 500 })
  }
}
