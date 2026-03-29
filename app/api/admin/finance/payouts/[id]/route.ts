import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { completeVendorPayout, rejectVendorPayout } from '@/lib/storage'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || !isAdmin(user.id)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { action, adminNotes } = body

    if (action === 'complete') {
      const success = await completeVendorPayout(id, adminNotes)
      if (!success) {
        return NextResponse.json({ error: 'Payout not found or already processed' }, { status: 404 })
      }
      return NextResponse.json({ success: true })
    }

    if (action === 'reject') {
      const success = await rejectVendorPayout(id, adminNotes)
      if (!success) {
        return NextResponse.json({ error: 'Payout not found or already processed' }, { status: 404 })
      }
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action. Use "complete" or "reject"' }, { status: 400 })
  } catch (error) {
    console.error('Payout action error:', error)
    return NextResponse.json({ error: 'Failed to process payout action' }, { status: 500 })
  }
}
