import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { unlinkDiscordFromUser } from '@/lib/storage'

export async function POST() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

  // Check if user is logged in
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.redirect(new URL('/?error=not_logged_in', baseUrl))
  }

  // Unlink Discord from user account
  await unlinkDiscordFromUser(user.id)

  return NextResponse.redirect(new URL('/dashboard/profile?discord=unlinked', baseUrl))
}
