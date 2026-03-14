'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function CheckoutContent() {
  const searchParams = useSearchParams()
  const amount = searchParams.get('amount')
  const invoiceId = searchParams.get('invoiceId')

  return (
    <div className="bg-dark-800/50 border border-dark-500 rounded-2xl p-8 max-w-md w-full mx-4 text-center">
      <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h1 className="text-2xl font-bold text-white mb-2">Mock Payment Successful</h1>

      <p className="text-gray-400 mb-6">
        This is a dev mode simulated payment.
        {amount && <> Amount: <span className="text-white font-medium">${amount}</span></>}
      </p>

      {invoiceId && (
        <p className="text-xs text-gray-500 mb-6 break-all">
          Invoice: {invoiceId}
        </p>
      )}

      <div className="bg-accent/10 border border-accent/20 rounded-xl p-4 mb-6">
        <p className="text-sm text-accent">
          Go back to the deposit page and click &quot;Verify Payment&quot; to credit your wallet.
        </p>
      </div>

      <Link
        href="/dashboard/deposit"
        className="inline-block px-6 py-3 bg-accent hover:bg-accent-light text-white font-medium rounded-xl transition-colors"
      >
        Back to Deposits
      </Link>
    </div>
  )
}

export default function MockCheckoutSuccess() {
  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center">
      <Suspense fallback={
        <div className="text-gray-400">Loading...</div>
      }>
        <CheckoutContent />
      </Suspense>
    </div>
  )
}
