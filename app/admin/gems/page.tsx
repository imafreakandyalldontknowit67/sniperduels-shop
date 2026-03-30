'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui'
import { Gem, Send, Clock, CheckCircle, XCircle, Loader2, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'

interface DepositOrder {
  id: string
  quantity: number
  status: string
  createdAt: string
  completedAt?: string
}

export default function AdminGemsPage() {
  const [currentStock, setCurrentStock] = useState<number | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // Deposit via bot state
  const [depositAmount, setDepositAmount] = useState('')
  const [depositing, setDepositing] = useState(false)
  const [deposits, setDeposits] = useState<DepositOrder[]>([])

  // Withdraw via bot state
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawing, setWithdrawing] = useState(false)
  const [withdrawals, setWithdrawals] = useState<DepositOrder[]>([])

  useEffect(() => {
    fetchStock()
    fetchDeposits()
    fetchWithdrawals()
  }, [])

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  async function fetchStock() {
    try {
      const res = await fetch('/api/admin/gems')
      if (res.ok) {
        const data = await res.json()
        setCurrentStock(data.balanceInK)
        setInputValue(data.balanceInK.toString())
      }
    } catch { /* Failed to fetch */ }
  }

  async function fetchDeposits() {
    try {
      const res = await fetch('/api/admin/gems/deposit')
      if (res.ok) {
        const data = await res.json()
        setDeposits(data.deposits)
      }
    } catch { /* ignore */ }
  }

  async function handleSave() {
    const value = parseInt(inputValue)
    if (isNaN(value) || value < 0) return

    setSaving(true)
    try {
      const res = await fetch('/api/admin/gems', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ balanceInK: value }),
      })

      if (res.ok) {
        const data = await res.json()
        setCurrentStock(data.balanceInK)
        setToast('Gem stock updated')
      }
    } catch {
      setToast('Failed to update')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeposit() {
    const amount = parseInt(depositAmount)
    if (isNaN(amount) || amount < 1) return

    setDepositing(true)
    try {
      const res = await fetch('/api/admin/gems/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountK: amount }),
      })

      const data = await res.json()
      if (res.ok) {
        setToast(`Deposit queued: ${amount}k gems. Trade them to the bot.`)
        setDepositAmount('')
        fetchDeposits()
      } else {
        setToast(data.error || 'Failed to create deposit')
      }
    } catch {
      setToast('Network error')
    } finally {
      setDepositing(false)
    }
  }

  async function fetchWithdrawals() {
    try {
      const res = await fetch('/api/admin/gems/withdraw')
      if (res.ok) {
        const data = await res.json()
        setWithdrawals(data.withdrawals)
      }
    } catch { /* ignore */ }
  }

  async function handleWithdraw() {
    const amount = parseInt(withdrawAmount)
    if (isNaN(amount) || amount < 1) return

    setWithdrawing(true)
    try {
      const res = await fetch('/api/admin/gems/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountK: amount }),
      })

      const data = await res.json()
      if (res.ok) {
        setToast(`Withdrawal queued: ${amount}k gems. Accept the bot trade in-game.`)
        setWithdrawAmount('')
        fetchStock()
        fetchWithdrawals()
      } else {
        setToast(data.error || 'Failed to create withdrawal')
      }
    } catch {
      setToast('Network error')
    } finally {
      setWithdrawing(false)
    }
  }

  const quickAmounts = [100, 250, 500, 1000]
  const depositQuickAmounts = [50, 100, 250, 500]

  const statusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4 text-yellow-400" />
      case 'processing': return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-400" />
      case 'failed': return <XCircle className="w-4 h-4 text-red-400" />
      default: return null
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Gem className="w-8 h-8 text-accent" />
        <h1 className="text-3xl font-bold text-white">Gem Stock</h1>
      </div>

      {toast && (
        <div className="mb-6 p-3 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 text-sm">
          {toast}
        </div>
      )}

      {/* Current Stock */}
      <div className="bg-dark-800/50 rounded-xl p-8 mb-8">
        <div className="text-gray-400 text-sm mb-2">Current Balance</div>
        <div className="text-5xl font-bold text-white mb-1">
          {currentStock !== null ? `${currentStock.toLocaleString()}k` : '...'}
        </div>
        <div className="text-gray-500 text-sm">
          {currentStock !== null && currentStock > 0
            ? `${(currentStock * 1000).toLocaleString()} gems available for trading`
            : 'No gems in stock — purchases are disabled'
          }
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Deposit via Bot */}
        <div className="bg-dark-800/50 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Send className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold text-white">Deposit via Bot</h2>
          </div>
          <p className="text-gray-500 text-xs mb-4">
            Queue a deposit order. Trade gems to the bot in-game and stock updates automatically.
          </p>

          <div className="flex gap-2 mb-3">
            {depositQuickAmounts.map((amt) => (
              <button
                key={amt}
                onClick={() => setDepositAmount(amt.toString())}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  depositAmount === amt.toString()
                    ? 'bg-accent text-white'
                    : 'bg-dark-600 text-gray-300 hover:bg-dark-500'
                }`}
              >
                {amt}k
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <div className="flex-1 relative">
              <input
                type="number"
                min="1"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="w-full bg-dark-600 border border-dark-500 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-accent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="Amount in K"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">k</span>
            </div>
            <button
              onClick={handleDeposit}
              disabled={depositing || !depositAmount || parseInt(depositAmount) < 1}
              className="px-5 py-3 rounded-lg font-bold text-sm uppercase transition-colors disabled:opacity-50 bg-accent hover:bg-accent-light text-black"
            >
              {depositing ? 'Queuing...' : 'Queue Deposit'}
            </button>
          </div>
        </div>

        {/* Manual Set Stock */}
        <div className="bg-dark-800/50 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Set Stock Manually</h2>

          <div className="flex gap-2 mb-3">
            {quickAmounts.map((amt) => (
              <button
                key={amt}
                onClick={() => setInputValue(amt.toString())}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  inputValue === amt.toString()
                    ? 'bg-accent text-white'
                    : 'bg-dark-600 text-gray-300 hover:bg-dark-500'
                }`}
              >
                {amt}k
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <div className="flex-1 relative">
              <input
                type="number"
                min="0"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-full bg-dark-600 border border-dark-500 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-accent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="Amount in K"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">k</span>
            </div>
            <Button onClick={handleSave} disabled={saving || !inputValue}>
              {saving ? 'Saving...' : 'Set Stock'}
            </Button>
          </div>
          <p className="text-gray-600 text-[10px] mt-2">This overwrites the current stock value.</p>
        </div>

        {/* Withdraw via Bot */}
        <div className="bg-dark-800/50 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <ArrowUpRight className="w-5 h-5 text-red-400" />
            <h2 className="text-lg font-semibold text-white">Withdraw via Bot</h2>
          </div>
          <p className="text-gray-500 text-xs mb-4">
            Queue a withdrawal. Bot trades gems back to you in-game. Stock deducted immediately, refunded if it fails.
          </p>

          <div className="flex gap-2 mb-3">
            {depositQuickAmounts.map((amt) => (
              <button
                key={amt}
                onClick={() => setWithdrawAmount(amt.toString())}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  withdrawAmount === amt.toString()
                    ? 'bg-red-500 text-white'
                    : 'bg-dark-600 text-gray-300 hover:bg-dark-500'
                }`}
              >
                {amt}k
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <div className="flex-1 relative">
              <input
                type="number"
                min="1"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="w-full bg-dark-600 border border-dark-500 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="Amount in K"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">k</span>
            </div>
            <button
              onClick={handleWithdraw}
              disabled={withdrawing || !withdrawAmount || parseInt(withdrawAmount) < 1}
              className="px-5 py-3 rounded-lg font-bold text-sm uppercase transition-colors disabled:opacity-50 bg-red-500 hover:bg-red-400 text-white"
            >
              {withdrawing ? 'Queuing...' : 'Queue Withdraw'}
            </button>
          </div>
        </div>
      </div>

      {/* Recent Deposits */}
      {deposits.length > 0 && (
        <div className="bg-dark-800/50 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Recent Deposits</h2>
          <div className="space-y-2">
            {deposits.map(d => (
              <div
                key={d.id}
                className="flex items-center justify-between p-3 rounded-lg"
                style={{ background: '#1a1a1e', border: '1px solid #2a2a2e' }}
              >
                <div className="flex items-center gap-3">
                  {statusIcon(d.status)}
                  <span className="text-white text-sm font-bold">{d.quantity}k gems</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-[10px] uppercase font-bold ${
                    d.status === 'completed' ? 'text-green-400' :
                    d.status === 'failed' ? 'text-red-400' :
                    d.status === 'processing' ? 'text-blue-400' :
                    'text-yellow-400'
                  }`}>
                    {d.status}
                  </span>
                  <span className="text-gray-500 text-[10px]">
                    {new Date(d.createdAt).toLocaleString()}
                  </span>
                  {(d.status === 'pending' || d.status === 'processing') && (
                    <Link
                      href={`/dashboard/orders/${d.id}`}
                      className="text-accent text-[10px] uppercase font-bold hover:underline"
                    >
                      Track
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Withdrawals */}
      {withdrawals.length > 0 && (
        <div className="bg-dark-800/50 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Recent Withdrawals</h2>
          <div className="space-y-2">
            {withdrawals.map(w => (
              <div
                key={w.id}
                className="flex items-center justify-between p-3 rounded-lg"
                style={{ background: '#1a1a1e', border: '1px solid #2a2a2e' }}
              >
                <div className="flex items-center gap-3">
                  {statusIcon(w.status)}
                  <span className="text-white text-sm font-bold">{w.quantity}k gems</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-[10px] uppercase font-bold ${
                    w.status === 'completed' ? 'text-green-400' :
                    w.status === 'failed' ? 'text-red-400' :
                    w.status === 'processing' ? 'text-blue-400' :
                    'text-yellow-400'
                  }`}>
                    {w.status}
                  </span>
                  <span className="text-gray-500 text-[10px]">
                    {new Date(w.createdAt).toLocaleString()}
                  </span>
                  {(w.status === 'pending' || w.status === 'processing') && (
                    <Link
                      href={`/dashboard/orders/${w.id}`}
                      className="text-accent text-[10px] uppercase font-bold hover:underline"
                    >
                      Track
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="bg-dark-800/50 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-gray-400 mb-3">How it works</h3>
        <ul className="space-y-2 text-sm text-gray-500">
          <li><strong className="text-gray-400">Deposit via Bot:</strong> Queue a deposit, then trade gems to the bot in the private server. Stock is added automatically when the bot receives them.</li>
          <li><strong className="text-gray-400">Set Manually:</strong> Override the stock value directly. Use this to correct discrepancies.</li>
          <li>When a user purchases gems, the stock is deducted automatically.</li>
          <li>If a trade fails, the stock is restored and the user is refunded.</li>
        </ul>
      </div>
    </div>
  )
}
