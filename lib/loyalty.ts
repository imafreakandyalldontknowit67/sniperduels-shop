// Loyalty tier types and constants (client-safe - no fs imports)

export type LoyaltyTier = 'member' | 'silver' | 'gold'

export const LOYALTY_TIERS = {
  member: { minSpend: 0, discount: 0, label: 'Member', color: 'gray' },
  silver: { minSpend: 100, discount: 0.005, label: 'Silver', color: 'silver' },
  gold: { minSpend: 300, discount: 0.01, label: 'Gold', color: 'gold' },
} as const

export function calculateLoyaltyTier(lifetimeSpend: number): LoyaltyTier {
  if (lifetimeSpend >= LOYALTY_TIERS.gold.minSpend) return 'gold'
  if (lifetimeSpend >= LOYALTY_TIERS.silver.minSpend) return 'silver'
  return 'member'
}

export function getLoyaltyDiscount(tier: LoyaltyTier): number {
  return LOYALTY_TIERS[tier].discount
}
