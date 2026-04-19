'use client'

import { useState, useEffect } from 'react'
import posthog from 'posthog-js'

interface ReferralData {
  referralCode: string
  referralUrl: string
  totalReferred: number
  totalCredited: number
  totalEarned: number
  referrals: Array<{
    referredName: string
    status: string
    commission: number | null
    date: string
  }>
}

export default function ReferralCard({ referredBy }: { referredBy: string | null }) {
  const [data, setData] = useState<ReferralData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [codeInput, setCodeInput] = useState('')
  const [applying, setApplying] = useState(false)
  const [applyError, setApplyError] = useState('')
  const [applySuccess, setApplySuccess] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    fetch('/api/referral')
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function copyCode() {
    if (!data) return
    try {
      await navigator.clipboard.writeText(data.referralUrl)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = data.referralUrl
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    posthog.capture('referral_code_copied')
    setTimeout(() => setCopied(false), 2000)
  }

  async function applyCode() {
    if (!codeInput.trim()) return
    setApplying(true)
    setApplyError('')
    try {
      const res = await fetch('/api/referral/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeInput.trim() }),
      })
      const body = await res.json()
      if (!res.ok) {
        setApplyError(body.error || 'Failed to apply code.')
      } else {
        setApplySuccess(true)
        posthog.capture('referral_code_applied', { code: codeInput.trim() })
      }
    } catch {
      setApplyError('Connection error. Please try again.')
    }
    setApplying(false)
  }

  if (loading) {
    return (
      <div className="bg-dark-800/50 rounded-xl p-6">
        <div className="h-6 w-32 bg-dark-600 rounded animate-pulse mb-4" />
        <div className="h-10 bg-dark-600 rounded animate-pulse" />
      </div>
    )
  }

  return (
    <div className="bg-dark-800/50 rounded-xl p-6">
      <h2 className="text-lg font-semibold text-white mb-4">Referral Program</h2>

      {/* Your referral code */}
      {data && (
        <div className="mb-4">
          <p className="text-gray-400 text-sm mb-2">Your referral link</p>
          <div className="flex gap-2">
            <div className="flex-1 bg-dark-600 rounded-lg px-4 py-3 text-white font-mono text-sm truncate">
              {data.referralUrl}
            </div>
            <button
              onClick={copyCode}
              className="relative inline-flex items-center justify-center pixel-btn-press"
            >
              <img src="/images/pixel/pngs/asset-60.png" alt="" className="h-[40px] w-auto" style={{ imageRendering: 'pixelated', filter: copied ? 'hue-rotate(90deg) brightness(1.2)' : 'none' }} />
              <span className="absolute inset-0 flex items-center justify-center font-bold text-white text-[10px] sm:text-xs uppercase tracking-wider">
                {copied ? 'Copied!' : 'Copy'}
              </span>
            </button>
          </div>
          <p className="text-gray-500 text-xs mt-2">
            Share this link. You get $0.75 and they get $0.50 when they complete their first order.
          </p>
        </div>
      )}

      {/* Stats */}
      {data && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-dark-600 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-white">{data.totalReferred}</p>
            <p className="text-gray-500 text-xs">Referred</p>
          </div>
          <div className="bg-dark-600 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-green-400">{data.totalCredited}</p>
            <p className="text-gray-500 text-xs">Completed</p>
          </div>
          <div className="bg-dark-600 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-accent">${data.totalEarned.toFixed(2)}</p>
            <p className="text-gray-500 text-xs">Earned</p>
          </div>
        </div>
      )}

      {/* Referral history */}
      {data && data.referrals.length > 0 && (
        <div className="mb-4">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="text-sm text-accent hover:text-accent-light transition-colors"
          >
            {showHistory ? 'Hide' : 'View'} referral history ({data.referrals.length})
          </button>
          {showHistory && (
            <div className="mt-2 space-y-2">
              {data.referrals.map((r, i) => (
                <div key={i} className="flex justify-between items-center text-sm bg-dark-600 rounded-lg px-3 py-2">
                  <span className="text-gray-300">{r.referredName}</span>
                  <div className="flex items-center gap-3">
                    {r.commission !== null && (
                      <span className="text-green-400">+${r.commission.toFixed(2)}</span>
                    )}
                    <span className={r.status === 'credited' ? 'text-green-400' : 'text-yellow-400'}>
                      {r.status === 'credited' ? 'Completed' : 'Pending'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Apply referral code */}
      {!referredBy && !applySuccess && (
        <div className="border-t border-dark-600 pt-4">
          <p className="text-gray-400 text-sm mb-2">Have a referral code?</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={codeInput}
              onChange={e => setCodeInput(e.target.value.toUpperCase())}
              placeholder="SD-XXXXXX"
              maxLength={9}
              className="flex-1 bg-dark-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <button
              onClick={applyCode}
              disabled={applying || !codeInput.trim()}
              className="relative inline-flex items-center justify-center pixel-btn-press disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <img src="/images/pixel/pngs/asset-60.png" alt="" className="h-[36px] w-auto" style={{ imageRendering: 'pixelated' }} />
              <span className="absolute inset-0 flex items-center justify-center font-bold text-white text-[10px] sm:text-xs uppercase tracking-wider">
                {applying ? 'Applying...' : 'Apply'}
              </span>
            </button>
          </div>
          {applyError && <p className="text-red-400 text-xs mt-2">{applyError}</p>}
        </div>
      )}
      {(referredBy || applySuccess) && (
        <div className="border-t border-dark-600 pt-4">
          <p className="text-green-400 text-sm">
            Referral code applied! You&apos;ll get $0.50 bonus when you complete your first order.
          </p>
        </div>
      )}
    </div>
  )
}
