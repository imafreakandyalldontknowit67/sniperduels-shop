import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getDeposit, getWalletBalance } from '@/lib/storage'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { depositId } = body

    if (!depositId) {
      return NextResponse.json({ error: 'depositId is required' }, { status: 400 })
    }

    const deposit = await getDeposit(depositId)
    if (!deposit) {
      return NextResponse.json({ error: 'Deposit not found' }, { status: 404 })
    }

    if (deposit.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const walletBalance = await getWalletBalance(user.id)

    if (deposit.status === 'completed') {
      return NextResponse.json({
        status: 'completed',
        walletBalance,
        message: `$${deposit.amount.toFixed(2)} added to your wallet!`,
      })
    }

    // Still pending — webhook hasn't processed yet
    return NextResponse.json({
      status: deposit.status,
      walletBalance,
      message: deposit.status === 'pending'
        ? 'Payment processing. This usually takes a few seconds — try again shortly.'
        : `Deposit is ${deposit.status}`,
    })
  } catch (error) {
    console.error('Deposit verification error:', error)
    return NextResponse.json(
      { error: 'Failed to verify deposit' },
      { status: 500 }
    )
  }
}
