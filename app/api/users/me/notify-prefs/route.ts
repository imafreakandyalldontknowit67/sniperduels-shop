import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * POST /api/users/me/notify-prefs
 * Body: { notifyOnBotRecovery: boolean }
 *
 * Used by the offline banner on /gems for users who already have Discord
 * linked — toggles the recovery DM opt-in without going through OAuth again.
 *
 * Hard requirement: must have Discord linked. The Discord bot's recovery DM
 * batch filters on `discordId IS NOT NULL`, so setting this flag without a
 * linked Discord account is meaningless. We surface that as a 400 so the UI
 * can route to the OAuth link flow instead.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { notifyOnBotRecovery?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (typeof body.notifyOnBotRecovery !== 'boolean') {
    return NextResponse.json({ error: 'notifyOnBotRecovery must be a boolean' }, { status: 400 })
  }

  const stored = await prisma.user.findUnique({
    where: { id: user.id },
    select: { discordId: true },
  })

  if (!stored) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Only allow turning the flag ON when Discord is linked. Allow turning OFF
  // unconditionally so users can always opt out.
  if (body.notifyOnBotRecovery && !stored.discordId) {
    return NextResponse.json(
      { error: 'discord_not_linked', message: 'Link Discord first to receive recovery DMs.' },
      { status: 400 },
    )
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { notifyOnBotRecovery: body.notifyOnBotRecovery },
  })

  return NextResponse.json({ ok: true, notifyOnBotRecovery: body.notifyOnBotRecovery })
}
