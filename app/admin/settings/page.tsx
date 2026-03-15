'use client'

import { useState, useEffect } from 'react'
import { Settings, Loader2, Package, Wallet } from 'lucide-react'

export default function SettingsPage() {
  const [itemsComingSoon, setItemsComingSoon] = useState(true)
  const [depositsDisabled, setDepositsDisabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [savingItems, setSavingItems] = useState(false)
  const [savingDeposits, setSavingDeposits] = useState(false)

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(res => res.json())
      .then(data => {
        setItemsComingSoon(data.itemsComingSoon)
        setDepositsDisabled(data.depositsDisabled ?? false)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleToggleItems() {
    const newValue = !itemsComingSoon
    setSavingItems(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemsComingSoon: newValue }),
      })
      if (res.ok) setItemsComingSoon(newValue)
    } catch {} finally {
      setSavingItems(false)
    }
  }

  async function handleToggleDeposits() {
    const newValue = !depositsDisabled
    setSavingDeposits(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ depositsDisabled: newValue }),
      })
      if (res.ok) setDepositsDisabled(newValue)
    } catch {} finally {
      setSavingDeposits(false)
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-8">Settings</h1>

      <div className="bg-dark-800/50 rounded-xl p-8">
        <div className="flex items-center gap-4 mb-6">
          <Settings className="w-8 h-8 text-accent" />
          <div>
            <h2 className="text-xl font-semibold text-white">Shop Settings</h2>
            <p className="text-gray-400">Configure your shop settings</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-accent animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="p-4 bg-dark-600 rounded-lg">
              <div className="flex items-start gap-3 mb-3">
                <Package className="w-5 h-5 text-accent mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-white font-medium">Items Coming Soon</h3>
                  <p className="text-gray-400 text-sm mt-1">
                    When enabled, the Items shop page shows a &quot;Coming Soon&quot; message instead of listings.
                    Gem purchases remain unaffected. Disable this when you&apos;re ready to launch the items shop.
                  </p>
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <button
                  onClick={handleToggleItems}
                  disabled={savingItems}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    itemsComingSoon ? 'bg-accent' : 'bg-dark-500'
                  } ${savingItems ? 'opacity-50' : ''}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                      itemsComingSoon ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
                <span className="text-gray-300 text-sm">
                  {savingItems ? 'Saving...' : itemsComingSoon ? 'Enabled — items shop shows Coming Soon' : 'Disabled — items shop is live'}
                </span>
              </label>
            </div>

            <div className="p-4 bg-dark-600 rounded-lg">
              <div className="flex items-start gap-3 mb-3">
                <Wallet className="w-5 h-5 text-accent mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-white font-medium">Disable Deposits</h3>
                  <p className="text-gray-400 text-sm mt-1">
                    When enabled, users cannot create new deposits. Existing pending deposits can still be verified.
                    Use this to temporarily pause incoming payments.
                  </p>
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <button
                  onClick={handleToggleDeposits}
                  disabled={savingDeposits}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    depositsDisabled ? 'bg-red-500' : 'bg-dark-500'
                  } ${savingDeposits ? 'opacity-50' : ''}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                      depositsDisabled ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
                <span className="text-gray-300 text-sm">
                  {savingDeposits ? 'Saving...' : depositsDisabled ? 'Enabled — deposits are blocked' : 'Disabled — deposits are open'}
                </span>
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
