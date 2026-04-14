import { prisma } from './prisma'
import { addToWallet, createLedgerEntry } from './storage'

const REFERRAL_COMMISSION_REFERRER = 0.75
const REFERRAL_COMMISSION_REFERRED = 0.50

export function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no I/O/0/1 for readability
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return `SD-${code}`
}

export async function ensureReferralCode(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { referralCode: true },
  })
  if (user?.referralCode) return user.referralCode

  // Generate unique code with retry
  for (let i = 0; i < 5; i++) {
    const code = generateReferralCode()
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { referralCode: code },
      })
      return code
    } catch {
      // Collision — retry with new code
    }
  }
  throw new Error('Failed to generate unique referral code')
}

export async function applyReferralCode(
  userId: string,
  code: string
): Promise<{ success: true } | { success: false; error: string }> {
  const normalizedCode = code.trim().toUpperCase()

  // Find referrer by code
  const referrer = await prisma.user.findFirst({
    where: { referralCode: normalizedCode },
    select: { id: true, name: true },
  })
  if (!referrer) return { success: false, error: 'Invalid referral code.' }

  // Can't refer yourself
  if (referrer.id === userId) return { success: false, error: 'You cannot use your own referral code.' }

  // Check if already referred
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { referredBy: true },
  })
  if (user?.referredBy) return { success: false, error: 'You already have a referral code applied.' }

  // Link the referral
  try {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { referredBy: referrer.id },
      }),
      prisma.referral.create({
        data: {
          referrerUserId: referrer.id,
          referredUserId: userId,
          status: 'pending',
          createdAt: new Date().toISOString(),
        },
      }),
    ])
  } catch {
    // Unique constraint on referredUserId — already referred
    return { success: false, error: 'You already have a referral code applied.' }
  }

  return { success: true }
}

export async function processReferralCommission(orderId: string, userId: string): Promise<void> {
  // Check if this user was referred
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { referredBy: true, referralCreditedAt: true },
  })
  if (!user?.referredBy || user.referralCreditedAt) return

  // Atomically claim the referral (only first completed order triggers this)
  const result = await prisma.referral.updateMany({
    where: { referredUserId: userId, status: 'pending' },
    data: {
      status: 'credited',
      orderId,
      commissionAmount: REFERRAL_COMMISSION_REFERRER,
      creditedAt: new Date().toISOString(),
    },
  })
  if (result.count === 0) return // Already credited or no referral

  const now = new Date().toISOString()

  // Mark user as credited
  await prisma.user.update({
    where: { id: userId },
    data: { referralCreditedAt: now },
  })

  // Credit referrer
  const referrerCredited = await addToWallet(user.referredBy, REFERRAL_COMMISSION_REFERRER)
  if (referrerCredited) {
    await createLedgerEntry({
      type: 'referral_commission',
      userId: user.referredBy,
      amount: REFERRAL_COMMISSION_REFERRER,
      description: 'Referral commission: referred user completed first order',
      relatedId: orderId,
    })
  } else {
    console.error(`[Referral] Failed to credit referrer ${user.referredBy} $${REFERRAL_COMMISSION_REFERRER} (wallet at max?)`)
  }

  // Credit referred user
  const referredCredited = await addToWallet(userId, REFERRAL_COMMISSION_REFERRED)
  if (referredCredited) {
    await createLedgerEntry({
      type: 'referral_commission',
      userId,
      amount: REFERRAL_COMMISSION_REFERRED,
      description: 'Referral bonus: first order completed',
      relatedId: orderId,
    })
  } else {
    console.error(`[Referral] Failed to credit referred user ${userId} $${REFERRAL_COMMISSION_REFERRED} (wallet at max?)`)
  }
}

export async function getReferralStats(userId: string): Promise<{
  referralCode: string | null
  totalReferred: number
  totalCredited: number
  totalEarned: number
  referrals: Array<{
    referredName: string
    status: string
    commission: number | null
    date: string
  }>
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { referralCode: true },
  })

  const referrals = await prisma.referral.findMany({
    where: { referrerUserId: userId },
    orderBy: { createdAt: 'desc' },
  })

  // Get referred user names
  const referredUserIds = referrals.map(r => r.referredUserId)
  const referredUsers = referredUserIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: referredUserIds } },
        select: { id: true, name: true },
      })
    : []
  const nameMap = new Map(referredUsers.map(u => [u.id, u.name]))

  return {
    referralCode: user?.referralCode || null,
    totalReferred: referrals.length,
    totalCredited: referrals.filter(r => r.status === 'credited').length,
    totalEarned: referrals
      .filter(r => r.commissionAmount)
      .reduce((sum, r) => sum + Number(r.commissionAmount), 0),
    referrals: referrals.map(r => ({
      referredName: nameMap.get(r.referredUserId) || 'Unknown',
      status: r.status,
      commission: r.commissionAmount ? Number(r.commissionAmount) : null,
      date: r.createdAt,
    })),
  }
}
