import { getCurrentUser } from '@/lib/auth'
import { getUser, getUserLoyaltyInfo, LOYALTY_TIERS, canUseDiscordFirstPurchaseDiscount } from '@/lib/storage'
import { User, Check, ExternalLink, Crown, Gift } from 'lucide-react'
import Link from 'next/link'
import { Price } from '@/components/ui'
import ReferralCard from '@/components/ReferralCard'

// Roblox icon component
function RobloxIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M5.164 0L.16 18.928 18.836 24l5.004-18.928L5.164 0zm9.086 14.727l-4.334-1.148 1.148-4.333 4.333 1.148-1.147 4.333z"/>
    </svg>
  )
}

// Discord icon component
function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
    </svg>
  )
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ discord?: string }>
}) {
  const params = await searchParams
  let currentUser = null
  try {
    currentUser = await getCurrentUser()
  } catch {
    // Session read failed transiently
  }

  if (!currentUser) {
    return (
      <div className="overflow-x-hidden">
        <div className="text-center py-16">
          <h1 className="text-2xl font-bold text-white mb-4">Profile</h1>
          <p className="text-gray-400 mb-6">Please log in to view your profile.</p>
          <a href="/api/auth/roblox" className="text-accent hover:underline uppercase text-sm">Login with Roblox</a>
        </div>
      </div>
    )
  }

  const storedUser = await getUser(currentUser.id)
  const loyaltyInfo = await getUserLoyaltyInfo(currentUser.id)
  const hasDiscordDiscount = await canUseDiscordFirstPurchaseDiscount(currentUser.id)

  const discordSuccess = params.discord === 'linked'
  const discordUnlinked = params.discord === 'unlinked'
  const discordError = params.discord === 'error'

  // Tier colors
  const tierColors = {
    member: 'text-gray-400 bg-gray-500/20 border-gray-500/30',
    silver: 'text-gray-300 bg-gray-400/20 border-gray-400/30',
    gold: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30',
  }

  return (
    <div className="overflow-x-hidden">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Profile</h1>
        <p className="text-gray-400 mt-1">Manage your account and linked services</p>
      </div>

      {/* Status Messages */}
      {discordSuccess && (
        <div className="mb-6 p-4 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400">
          Discord account linked successfully!
        </div>
      )}
      {discordUnlinked && (
        <div className="mb-6 p-4 bg-blue-500/20 border border-blue-500/30 rounded-lg text-blue-400">
          Discord account unlinked.
        </div>
      )}
      {discordError && (
        <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400">
          Failed to link Discord account. Please try again.
        </div>
      )}

      <div className="grid gap-6">
        {/* User Info Card */}
        <div className="bg-dark-800/50 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Account Info</h2>
          <div className="flex items-center gap-4">
            {currentUser?.avatar ? (
              <img src={currentUser.avatar} alt="" className="w-16 h-16 rounded-full" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-dark-600 flex items-center justify-center">
                <User className="w-8 h-8 text-gray-400" />
              </div>
            )}
            <div>
              <h3 className="text-xl font-bold text-white">{currentUser?.displayName}</h3>
              <p className="text-gray-400">@{currentUser?.name}</p>
              <p className="text-sm text-gray-500 mt-1">
                Member since {storedUser ? new Date(storedUser.createdAt).toLocaleDateString() : 'Unknown'}
              </p>
            </div>
          </div>
        </div>

        {/* Loyalty Program Card */}
        {loyaltyInfo && (
          <div className="bg-dark-800/50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Loyalty Program</h2>
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${tierColors[loyaltyInfo.tier]}`}>
                <Crown className="w-4 h-4" />
                <span className="text-sm font-medium">{LOYALTY_TIERS[loyaltyInfo.tier].label}</span>
              </div>
            </div>

            {/* Current Benefits */}
            <div className="mb-6 p-4 bg-dark-600 rounded-lg">
              <p className="text-gray-400 text-sm mb-1">Your Discount</p>
              <p className="text-2xl font-bold text-white">
                {loyaltyInfo.discount > 0 ? `${parseFloat((loyaltyInfo.discount * 100).toFixed(1))}% off` : 'No discount yet'}
              </p>
              <p className="text-gray-500 text-sm mt-1">
                Lifetime spend: <Price amount={loyaltyInfo.lifetimeSpend} />
              </p>
            </div>

            {/* Progress to Next Tier */}
            {loyaltyInfo.nextTier && (
              <div className="mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">Progress to {LOYALTY_TIERS[loyaltyInfo.nextTier].label}</span>
                  <span className="text-gray-400"><Price amount={loyaltyInfo.spendToNextTier} /> to go</span>
                </div>
                <div className="h-2 bg-dark-600 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, ((LOYALTY_TIERS[loyaltyInfo.nextTier].minSpend - loyaltyInfo.spendToNextTier) / LOYALTY_TIERS[loyaltyInfo.nextTier].minSpend) * 100)}%`
                    }}
                  />
                </div>
                <p className="text-gray-500 text-xs mt-2">
                  Reach {LOYALTY_TIERS[loyaltyInfo.nextTier].label} for {parseFloat((LOYALTY_TIERS[loyaltyInfo.nextTier].discount * 100).toFixed(1))}% off all purchases
                </p>
              </div>
            )}

            {loyaltyInfo.tier === 'gold' && (
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-yellow-400 text-sm text-center">
                  You&apos;ve reached the highest tier! Enjoy 1% off all purchases.
                </p>
              </div>
            )}

            {/* Discord First Purchase Bonus */}
            {hasDiscordDiscount && (
              <div className="mt-4 p-4 bg-accent/10 border border-accent/30 rounded-lg flex items-start gap-3">
                <Gift className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-accent font-medium">Discord Bonus Available!</p>
                  <p className="text-gray-400 text-sm">You have 2.5% off your first purchase for linking Discord.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Referral Program Card */}
        <ReferralCard referredBy={storedUser?.referredBy ?? null} />

        {/* Linked Accounts Card */}
        <div className="bg-dark-800/50 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Linked Accounts</h2>
          <div className="space-y-4">
            {/* Roblox - Always Linked */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-dark-600 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-dark-500 flex items-center justify-center">
                  <RobloxIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white font-medium">Roblox</p>
                  <p className="text-sm text-gray-400">@{currentUser?.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-green-400">
                <Check className="w-4 h-4" />
                <span className="text-sm">Connected</span>
              </div>
            </div>

            {/* Discord */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-dark-600 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#5865F2] flex items-center justify-center">
                  <DiscordIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white font-medium">Discord</p>
                  {storedUser?.discordUsername ? (
                    <p className="text-sm text-gray-400">@{storedUser.discordUsername}</p>
                  ) : (
                    <p className="text-sm text-gray-500">Not connected</p>
                  )}
                </div>
              </div>
              {storedUser?.discordId ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-green-400">
                    <Check className="w-4 h-4" />
                    <span className="text-sm">Connected</span>
                  </div>
                  <form action="/api/auth/discord/unlink" method="POST">
                    <button
                      type="submit"
                      className="text-sm text-gray-400 hover:text-red-400 transition-colors"
                    >
                      Unlink
                    </button>
                  </form>
                </div>
              ) : (
                <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center sm:gap-3">
                  <span className="text-xs text-accent">2.5% off first purchase!</span>
                  <Link
                    href="/api/auth/discord"
                    className="flex items-center gap-2 px-4 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Connect
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
