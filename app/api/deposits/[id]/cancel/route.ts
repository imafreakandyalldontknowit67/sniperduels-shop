import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getVendorDeposit, updateVendorDepositStatus } from '@/lib/storage'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const deposit = await getVendorDeposit(id)

  if (!deposit) {
    return NextResponse.json({ error: 'Deposit not found' }, { status: 404 })
  }

  if (deposit.vendorId !== currentUser.id) {
    return NextResponse.json({ error: 'Not your deposit' }, { status: 403 })
  }

  if (deposit.status !== 'pending') {
    return NextResponse.json(
      { error: `Deposit is already ${deposit.status}` },
      { status: 400 }
    )
  }

  const updated = await updateVendorDepositStatus(id, 'failed')

  return NextResponse.json({ deposit: updated })
}
