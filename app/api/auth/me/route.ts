import { NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { getUser, getUserLoyaltyInfo, canUseDiscordFirstPurchaseDiscount } from '@/lib/storage'

export async function GET() {
  const user = await getCurrentUser()

  if (!user) {
    const response = NextResponse.json({ user: null, isAdmin: false, discordLinked: false })
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    return response
  }

  const storedUser = await getUser(user.id)
  const loyaltyInfo = await getUserLoyaltyInfo(user.id)

  const response = NextResponse.json({
    user,
    isAdmin: isAdmin(user.id),
    isVendor: storedUser?.isVendor || false,
    discordLinked: !!storedUser?.discordId,
    discordUsername: storedUser?.discordUsername,
    walletBalance: storedUser?.walletBalance || 0,
    // Loyalty program
    loyaltyTier: loyaltyInfo.tier,
    loyaltyDiscount: loyaltyInfo.discount,
    lifetimeSpend: loyaltyInfo.lifetimeSpend,
    canUseDiscordDiscount: await canUseDiscordFirstPurchaseDiscount(user.id),
  })
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
  response.headers.set('Pragma', 'no-cache')
  return response
}
