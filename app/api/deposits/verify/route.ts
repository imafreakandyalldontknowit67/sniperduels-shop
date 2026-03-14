import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getDeposit, claimPendingDeposit, addToWallet, getWalletBalance } from '@/lib/storage'
import { verifyInvoice } from '@/lib/pandabase'
import { notifyDeposit } from '@/lib/discord-webhook'

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

    if (deposit.status === 'completed') {
      return NextResponse.json({
        status: 'completed',
        walletBalance: await getWalletBalance(user.id),
        message: 'Deposit already completed',
      })
    }

    if (deposit.status !== 'pending') {
      return NextResponse.json({
        status: deposit.status,
        walletBalance: await getWalletBalance(user.id),
        message: `Deposit is ${deposit.status}`,
      })
    }

    // Verify with Pandabase
    const { isPaid, error } = await verifyInvoice(deposit.pandabaseInvoiceId)

    if (error) {
      return NextResponse.json(
        { status: 'pending', error, walletBalance: await getWalletBalance(user.id) },
        { status: 200 }
      )
    }

    if (isPaid) {
      // Atomically claim the deposit — only the first caller (verify or webhook) wins.
      // If the webhook already completed it, this returns false and we skip crediting.
      const claimed = await claimPendingDeposit(deposit.id)

      if (!claimed) {
        return NextResponse.json({
          status: 'completed',
          walletBalance: await getWalletBalance(user.id),
          message: 'Deposit already completed',
        })
      }

      await addToWallet(user.id, deposit.amount)

      await notifyDeposit(user.name, deposit.amount)

      return NextResponse.json({
        status: 'completed',
        walletBalance: await getWalletBalance(user.id),
        message: `$${deposit.amount.toFixed(2)} added to your wallet!`,
      })
    }

    return NextResponse.json({
      status: 'pending',
      walletBalance: await getWalletBalance(user.id),
      message: 'Payment not yet completed. Please complete checkout.',
    })
  } catch (error) {
    console.error('Deposit verification error:', error)
    return NextResponse.json(
      { error: 'Failed to verify deposit' },
      { status: 500 }
    )
  }
}
