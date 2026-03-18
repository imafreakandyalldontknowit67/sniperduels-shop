import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getUser, getVendorListing, upsertVendorListing, updateVendorListingActive } from '@/lib/storage'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dbUser = await getUser(user.id)
    if (!dbUser?.isVendor) {
      return NextResponse.json({ error: 'Not a vendor' }, { status: 403 })
    }

    const listing = await getVendorListing(user.id)
    return NextResponse.json({ listing })
  } catch (error) {
    console.error('Vendor listings GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch listing' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dbUser = await getUser(user.id)
    if (!dbUser?.isVendor) {
      return NextResponse.json({ error: 'Not a vendor' }, { status: 403 })
    }

    const body = await request.json()
    const { pricePerK, minOrderK: rawMin, maxOrderK: rawMax, bulkTiers } = body

    if (!pricePerK || typeof pricePerK !== 'number' || pricePerK < 0.01 || pricePerK > 100) {
      return NextResponse.json({ error: 'pricePerK must be between $0.01 and $100' }, { status: 400 })
    }

    const minK = rawMin ?? 1
    if (typeof minK !== 'number' || !Number.isInteger(minK) || minK < 1 || minK > 500) {
      return NextResponse.json({ error: 'minOrderK must be an integer between 1 and 500' }, { status: 400 })
    }

    const maxK = rawMax ?? 500
    if (typeof maxK !== 'number' || !Number.isInteger(maxK) || maxK < 1 || maxK > 500) {
      return NextResponse.json({ error: 'maxOrderK must be an integer between 1 and 500' }, { status: 400 })
    }

    if (minK > maxK) {
      return NextResponse.json({ error: 'minOrderK cannot exceed maxOrderK' }, { status: 400 })
    }

    // Validate bulk tiers structure
    if (bulkTiers !== null && bulkTiers !== undefined) {
      if (!Array.isArray(bulkTiers) || bulkTiers.length > 10) {
        return NextResponse.json({ error: 'bulkTiers must be an array of up to 10 tiers' }, { status: 400 })
      }
      for (const tier of bulkTiers) {
        if (!tier || typeof tier.minK !== 'number' || typeof tier.pricePerK !== 'number'
            || !Number.isInteger(tier.minK) || tier.minK < 1
            || tier.pricePerK < 0.01 || tier.pricePerK > 100) {
          return NextResponse.json({ error: 'Each bulk tier must have valid minK (int >= 1) and pricePerK ($0.01-$100)' }, { status: 400 })
        }
      }
    }

    const listing = await upsertVendorListing(user.id, {
      pricePerK,
      minOrderK: minK,
      maxOrderK: maxK,
      bulkTiers: bulkTiers || null,
    })

    return NextResponse.json({ listing })
  } catch (error) {
    console.error('Vendor listings POST error:', error)
    return NextResponse.json({ error: 'Failed to update listing' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dbUser = await getUser(user.id)
    if (!dbUser?.isVendor) {
      return NextResponse.json({ error: 'Not a vendor' }, { status: 403 })
    }

    const body = await request.json()
    const { active } = body

    if (typeof active !== 'boolean') {
      return NextResponse.json({ error: 'active must be a boolean' }, { status: 400 })
    }

    const listing = await updateVendorListingActive(user.id, active)
    if (!listing) {
      return NextResponse.json({ error: 'No listing found. Create one first.' }, { status: 404 })
    }

    return NextResponse.json({ listing })
  } catch (error) {
    console.error('Vendor listings PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update listing' }, { status: 500 })
  }
}
