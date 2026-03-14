'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui'
import { Gem } from 'lucide-react'

export default function AdminGemsPage() {
  const [currentStock, setCurrentStock] = useState<number | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    fetchStock()
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
    } catch {
      // Failed to fetch
    }
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

  const quickAmounts = [100, 250, 500, 1000]

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

      {/* Set Stock */}
      <div className="bg-dark-800/50 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">Set Gem Stock</h2>

        <div className="flex gap-3 mb-4">
          {quickAmounts.map((amt) => (
            <button
              key={amt}
              onClick={() => setInputValue(amt.toString())}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
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
              className="w-full bg-dark-600 border border-dark-500 rounded-lg px-4 py-3 text-white text-lg focus:outline-none focus:border-accent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              placeholder="Amount in K"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">k gems</span>
          </div>
          <Button onClick={handleSave} disabled={saving || !inputValue}>
            {saving ? 'Saving...' : 'Update Stock'}
          </Button>
        </div>
      </div>

      {/* Info */}
      <div className="bg-dark-800/50 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-gray-400 mb-3">How it works</h3>
        <ul className="space-y-2 text-sm text-gray-500">
          <li>Set this to the number of gems (in thousands) the bot account has available.</li>
          <li>When a user purchases gems, the stock is deducted automatically.</li>
          <li>If a trade fails, the stock is restored and the user is refunded.</li>
          <li>The gems page shows &quot;Out of Stock&quot; when the balance hits 0.</li>
        </ul>
      </div>
    </div>
  )
}
