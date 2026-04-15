import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getDeposit, getWalletBalance, claimPendingDeposit, addToWallet, getUser, createLedgerEntry } from '@/lib/storage'
import { getPaymentStatus } from '@/lib/nowpayments'
import { notifyDeposit } from '@/lib/discord-webhook'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { depositId } = await request.json()
    if (!depositId) {
      return NextResponse.json({ error: 'depositId is required' }, { status: 400 })
    }

    let deposit = await getDeposit(depositId)
    if (!deposit) {
      return NextResponse.json({ error: 'Deposit not found' }, { status: 404 })
    }
    if (deposit.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Polling fallback: if deposit is still pending and we have a payment provider ID,
    // check NOWPayments directly in case the webhook never arrived
    if (deposit.status === 'pending' && deposit.paymentProviderId) {
      try {
        const npStatus = await getPaymentStatus(deposit.paymentProviderId)
        if (npStatus === 'finished' || npStatus === 'confirmed') {
          const claimed = await claimPendingDeposit(deposit.id)
          if (claimed) {
            await addToWallet(deposit.userId, deposit.amount)
            createLedgerEntry({
              type: 'deposit',
              userId: deposit.userId,
              amount: deposit.amount,
              description: `Crypto deposit: $${deposit.amount}`,
              relatedId: deposit.id,
            }).catch(err => console.error('Ledger write failed (verify poll):', err))
            const u = await getUser(deposit.userId)
            notifyDeposit(u?.name || deposit.userId, deposit.amount).catch(() => {})
            console.log(`[Verify Poll] Recovered deposit via NP status check: ${deposit.id} ($${deposit.amount})`)
            // Refresh deposit to get updated status
            deposit = (await getDeposit(depositId))!
          }
        }
      } catch {
        // Non-critical — webhook might still arrive
      }
    }

    const walletBalance = await getWalletBalance(user.id)

    if (deposit.status === 'completed') {
      return NextResponse.json({
        status: 'completed',
        walletBalance,
        message: `$${deposit.amount.toFixed(2)} added to your wallet!`,
      })
    }

    return NextResponse.json({
      status: deposit.status,
      walletBalance,
      message: deposit.status === 'pending'
        ? 'Payment processing. This usually takes a few seconds.'
        : `Deposit is ${deposit.status}`,
    })
  } catch (error) {
    console.error('Verify error:', error)
    return NextResponse.json({ error: 'Failed to verify deposit' }, { status: 500 })
  }
}
