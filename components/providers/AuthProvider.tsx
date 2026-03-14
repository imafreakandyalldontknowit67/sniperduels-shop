'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { LoyaltyTier } from '@/lib/loyalty'

interface User {
  id: string
  name: string
  displayName: string
  avatar?: string
}

interface AuthContextType {
  user: User | null
  isAdmin: boolean
  isViewingAsConsumer: boolean
  isLoading: boolean
  discordLinked: boolean
  discordUsername?: string
  walletBalance: number
  // Loyalty program
  loyaltyTier: LoyaltyTier
  loyaltyDiscount: number
  lifetimeSpend: number
  canUseDiscordDiscount: boolean
  login: () => void
  logout: () => Promise<void>
  refresh: () => Promise<void>
  toggleViewMode: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isViewingAsConsumer, setIsViewingAsConsumer] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [discordLinked, setDiscordLinked] = useState(false)
  const [discordUsername, setDiscordUsername] = useState<string | undefined>()
  const [walletBalance, setWalletBalance] = useState(0)
  // Loyalty state
  const [loyaltyTier, setLoyaltyTier] = useState<LoyaltyTier>('member')
  const [loyaltyDiscount, setLoyaltyDiscount] = useState(0)
  const [lifetimeSpend, setLifetimeSpend] = useState(0)
  const [canUseDiscordDiscount, setCanUseDiscordDiscount] = useState(false)

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me')
      const data = await res.json()
      setUser(data.user)
      setIsAdmin(data.isAdmin)
      setDiscordLinked(data.discordLinked || false)
      setDiscordUsername(data.discordUsername)
      setWalletBalance(data.walletBalance || 0)
      // Loyalty data
      setLoyaltyTier(data.loyaltyTier || 'member')
      setLoyaltyDiscount(data.loyaltyDiscount || 0)
      setLifetimeSpend(data.lifetimeSpend || 0)
      setCanUseDiscordDiscount(data.canUseDiscordDiscount || false)
    } catch (error) {
      console.error('Failed to fetch user:', error)
      setUser(null)
      setIsAdmin(false)
      setDiscordLinked(false)
      setDiscordUsername(undefined)
      setWalletBalance(0)
      setLoyaltyTier('member')
      setLoyaltyDiscount(0)
      setLifetimeSpend(0)
      setCanUseDiscordDiscount(false)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUser()
  }, [])

  const login = () => {
    window.location.href = '/api/auth/roblox'
  }

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
    setIsAdmin(false)
    window.location.href = '/'
  }

  const refresh = async () => {
    setIsLoading(true)
    await fetchUser()
  }

  const toggleViewMode = () => {
    setIsViewingAsConsumer(prev => !prev)
  }

  return (
    <AuthContext.Provider value={{ user, isAdmin, isViewingAsConsumer, isLoading, discordLinked, discordUsername, walletBalance, loyaltyTier, loyaltyDiscount, lifetimeSpend, canUseDiscordDiscount, login, logout, refresh, toggleViewMode }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
