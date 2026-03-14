'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Users, Shield, Wallet, Search, MoreVertical, Plus, Minus, X } from 'lucide-react'
import type { StoredUser } from '@/lib/storage'

// Discord icon component
function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
    </svg>
  )
}

interface UsersTableProps {
  initialUsers: StoredUser[]
}

export function UsersTable({ initialUsers }: UsersTableProps) {
  const [users, setUsers] = useState(initialUsers)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState<StoredUser | null>(null)
  const [actionDropdownOpen, setActionDropdownOpen] = useState<string | null>(null)
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null)
  const [balanceModalOpen, setBalanceModalOpen] = useState(false)
  const [balanceAction, setBalanceAction] = useState<'add' | 'remove'>('add')
  const [balanceAmount, setBalanceAmount] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map())

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!actionDropdownOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-dropdown]') && !target.closest('[data-dropdown-trigger]')) {
        setActionDropdownOpen(null)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [actionDropdownOpen])

  const toggleDropdown = (userId: string) => {
    if (actionDropdownOpen === userId) {
      setActionDropdownOpen(null)
      return
    }

    const button = buttonRefs.current.get(userId)
    if (button) {
      const rect = button.getBoundingClientRect()
      setDropdownPosition({
        top: rect.top - 8, // Position above the button
        left: rect.right - 192, // 192px = w-48 (dropdown width), align right edge
      })
    }
    setActionDropdownOpen(userId)
  }

  // Filter users based on search query
  const filteredUsers = users.filter(user => {
    const query = searchQuery.toLowerCase()
    return (
      user.displayName.toLowerCase().includes(query) ||
      user.name.toLowerCase().includes(query) ||
      user.id.includes(query) ||
      (user.discordUsername?.toLowerCase().includes(query) ?? false)
    )
  })

  const openBalanceModal = (user: StoredUser, action: 'add' | 'remove') => {
    setSelectedUser(user)
    setBalanceAction(action)
    setBalanceAmount('')
    setBalanceModalOpen(true)
    setActionDropdownOpen(null)
  }

  const handleBalanceSubmit = async () => {
    if (!selectedUser || !balanceAmount) return

    const amount = parseFloat(balanceAmount)
    if (isNaN(amount) || amount <= 0) return

    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}/balance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, action: balanceAction }),
      })

      if (response.ok) {
        const data = await response.json()
        // Update local state
        setUsers(users.map(u =>
          u.id === selectedUser.id
            ? { ...u, walletBalance: data.newBalance }
            : u
        ))
        setBalanceModalOpen(false)
      }
    } catch (error) {
      console.error('Failed to update balance:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search users by name, ID, or Discord..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-dark-700 border border-dark-500 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-accent"
          />
        </div>
      </div>

      {filteredUsers.length === 0 ? (
        <div className="bg-dark-800/50 rounded-xl p-12 text-center">
          <Users className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            {searchQuery ? 'No users found' : 'No users yet'}
          </h3>
          <p className="text-gray-400">
            {searchQuery ? 'Try a different search term.' : 'Users will appear here when they log in.'}
          </p>
        </div>
      ) : (
        <div className="bg-dark-800/50 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-dark-800">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">User</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Roblox ID</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Discord</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Balance</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Role</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Last Login</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-dark-600/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {user.avatar ? (
                        <img src={user.avatar} alt="" className="w-10 h-10 rounded-full" />
                      ) : (
                        <div className="w-10 h-10 bg-dark-600 rounded-full flex items-center justify-center">
                          <Users className="w-5 h-5 text-gray-400" />
                        </div>
                      )}
                      <div>
                        <div className="text-white font-medium">{user.displayName}</div>
                        <div className="text-gray-500 text-sm">@{user.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-400 font-mono text-sm">{user.id}</td>
                  <td className="px-6 py-4">
                    {user.discordUsername ? (
                      <div className="flex items-center gap-2">
                        <DiscordIcon className="w-4 h-4 text-[#5865F2]" />
                        <span className="text-white text-sm">@{user.discordUsername}</span>
                      </div>
                    ) : (
                      <span className="text-gray-500 text-sm">Not linked</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-accent" />
                      <span className="text-white font-medium">${(user.walletBalance || 0).toFixed(2)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {user.isAdmin ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-accent/20 text-accent text-xs font-medium">
                        <Shield className="w-3 h-3" />
                        Admin
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full bg-dark-600 text-gray-400 text-xs font-medium">
                        User
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-sm">
                    {new Date(user.lastLogin).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      ref={(el) => {
                        if (el) buttonRefs.current.set(user.id, el)
                      }}
                      data-dropdown-trigger
                      onClick={() => toggleDropdown(user.id)}
                      className="p-2 text-gray-400 hover:text-white hover:bg-dark-600 rounded-lg transition-colors"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Actions Dropdown Portal */}
      {actionDropdownOpen && dropdownPosition && typeof document !== 'undefined' && createPortal(
        <div
          data-dropdown
          className="fixed w-48 bg-dark-800 border border-dark-600 rounded-lg shadow-xl z-50 overflow-hidden"
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            transform: 'translateY(-100%)',
          }}
        >
          <button
            onClick={() => {
              const user = users.find(u => u.id === actionDropdownOpen)
              if (user) openBalanceModal(user, 'add')
            }}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:bg-dark-700 hover:text-white transition-colors"
          >
            <Plus className="w-4 h-4 text-green-400" />
            Add Funds
          </button>
          <button
            onClick={() => {
              const user = users.find(u => u.id === actionDropdownOpen)
              if (user) openBalanceModal(user, 'remove')
            }}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:bg-dark-700 hover:text-white transition-colors"
          >
            <Minus className="w-4 h-4 text-red-400" />
            Remove Funds
          </button>
        </div>,
        document.body
      )}

      {/* Balance Adjustment Modal */}
      {balanceModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setBalanceModalOpen(false)}
          />
          <div className="relative bg-dark-800 border border-dark-600 rounded-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-dark-600">
              <h2 className="text-lg font-bold text-white">
                {balanceAction === 'add' ? 'Add Funds' : 'Remove Funds'}
              </h2>
              <button
                onClick={() => setBalanceModalOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {/* User Info */}
              <div className="flex items-center gap-3 mb-6 p-3 bg-dark-700 rounded-lg">
                {selectedUser.avatar ? (
                  <img src={selectedUser.avatar} alt="" className="w-10 h-10 rounded-full" />
                ) : (
                  <div className="w-10 h-10 bg-dark-600 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-gray-400" />
                  </div>
                )}
                <div>
                  <div className="text-white font-medium">{selectedUser.displayName}</div>
                  <div className="text-gray-400 text-sm">
                    Current balance: ${(selectedUser.walletBalance || 0).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Amount Input */}
              <div className="mb-6">
                <label className="block text-sm text-gray-400 mb-2">Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <input
                    type="number"
                    value={balanceAmount}
                    onChange={(e) => setBalanceAmount(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full bg-dark-700 border border-dark-500 rounded-lg px-4 py-3 pl-8 text-white placeholder-gray-500 focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              {/* Preview */}
              {balanceAmount && parseFloat(balanceAmount) > 0 && (
                <div className="mb-6 p-3 bg-dark-700 rounded-lg">
                  <div className="text-sm text-gray-400">New balance will be:</div>
                  <div className="text-xl font-bold text-white">
                    ${balanceAction === 'add'
                      ? ((selectedUser.walletBalance || 0) + parseFloat(balanceAmount)).toFixed(2)
                      : Math.max(0, (selectedUser.walletBalance || 0) - parseFloat(balanceAmount)).toFixed(2)
                    }
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                onClick={handleBalanceSubmit}
                disabled={isSubmitting || !balanceAmount || parseFloat(balanceAmount) <= 0}
                className={`w-full py-3 font-medium rounded-lg transition-colors ${
                  balanceAction === 'add'
                    ? 'bg-green-600 hover:bg-green-500 text-white'
                    : 'bg-red-600 hover:bg-red-500 text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isSubmitting ? 'Processing...' : balanceAction === 'add' ? 'Add Funds' : 'Remove Funds'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
