import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'
import { randomUUID, randomBytes, createHash } from 'crypto'
import { prisma } from './prisma'

// Require SESSION_SECRET — do not fall back to a weak default
if (!process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET environment variable is required')
}
const SESSION_SECRET = new TextEncoder().encode(process.env.SESSION_SECRET)

// --- Session blacklist (PostgreSQL via Prisma) ---

export async function blacklistSession(jti: string, expiresAt: number): Promise<void> {
  // Clean expired entries and upsert the new one
  const now = Math.floor(Date.now() / 1000)
  await prisma.sessionBlacklist.deleteMany({ where: { expiresAt: { lt: now } } })
  await prisma.sessionBlacklist.upsert({
    where: { jti },
    create: { jti, expiresAt },
    update: { expiresAt },
  })
}

async function isSessionBlacklisted(jti: string): Promise<boolean> {
  const entry = await prisma.sessionBlacklist.findUnique({ where: { jti } })
  return entry !== null
}

// --- PKCE helpers ---

export function generateCodeVerifier(): string {
  return randomBytes(32).toString('base64url')
}

export function generateCodeChallenge(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url')
}

// --- Types ---

export interface RobloxUser {
  id: string
  name: string
  displayName: string
  avatar?: string
  robloxCreatedAt?: string
}

export interface Session {
  user: RobloxUser
  // accessToken and refreshToken are intentionally NOT stored in the JWT.
  // They were only needed for the initial OAuth token exchange and user info fetch,
  // which happens before the session is created. Storing them in the JWT
  // would expose Roblox credentials to anyone who decodes the base64 payload.
  expiresAt: number
  lastActivity?: number // Unix timestamp (seconds) of last activity
}

// Idle timeout: 4 hours of inactivity invalidates session
const IDLE_TIMEOUT_MS = 4 * 60 * 60 * 1000
// Absolute session lifetime: 24 hours from creation regardless of activity
const MAX_SESSION_LIFETIME_S = 24 * 60 * 60

export async function createSession(session: Session): Promise<string> {
  const jti = randomUUID()
  const now = Math.floor(Date.now() / 1000)
  const token = await new SignJWT({ ...session, lastActivity: now })
    .setProtectedHeader({ alg: 'HS256' })
    .setJti(jti)
    .setIssuedAt(now)
    .setExpirationTime('7d')
    .sign(SESSION_SECRET)

  return token
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value

  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, SESSION_SECRET)
    // Check session blacklist
    if (payload.jti && await isSessionBlacklisted(payload.jti)) {
      return null
    }

    const session = payload as unknown as Session

    const nowSec = Math.floor(Date.now() / 1000)

    // Check absolute session lifetime (24h from creation)
    const issuedAt = payload.iat as number | undefined
    if (issuedAt && nowSec - issuedAt > MAX_SESSION_LIFETIME_S) {
      if (payload.jti && payload.exp) {
        await blacklistSession(payload.jti as string, payload.exp as number)
      }
      try { cookieStore.delete('session') } catch { /* Server Component context */ }
      return null
    }

    // Check idle timeout
    if (session.lastActivity) {
      const lastActivityMs = session.lastActivity * 1000
      if (Date.now() - lastActivityMs > IDLE_TIMEOUT_MS) {
        // Session expired due to inactivity — blacklist it
        if (payload.jti && payload.exp) {
          await blacklistSession(payload.jti as string, payload.exp as number)
        }
        try { cookieStore.delete('session') } catch { /* Server Component context */ }
        return null
      }
    }

    // Refresh activity timestamp by issuing a new token (preserves original iat)
    // Only refresh if more than 1 minute since last activity (avoid churning on every request)
    if (!session.lastActivity || nowSec - session.lastActivity > 60) {
      try {
        const newToken = await new SignJWT({ ...session, lastActivity: nowSec })
          .setProtectedHeader({ alg: 'HS256' })
          .setJti(payload.jti as string)
          .setIssuedAt(issuedAt || nowSec)
          .setExpirationTime('7d')
          .sign(SESSION_SECRET)

        cookieStore.set('session', newToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7,
          path: '/',
        })
      } catch {
        // cookies().set() is not available in Server Components — skip refresh
      }
    }

    return session
  } catch {
    return null
  }
}

export async function invalidateCurrentSession(): Promise<void> {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (token) {
    try {
      const { payload } = await jwtVerify(token, SESSION_SECRET)
      if (payload.jti && payload.exp) {
        await blacklistSession(payload.jti, payload.exp)
      }
    } catch {
      // Token already invalid, nothing to blacklist
    }
  }
  cookieStore.delete('session')
}

export async function getCurrentUser(): Promise<RobloxUser | null> {
  const session = await getSession()
  return session?.user || null
}

export function isAdmin(userId: string): boolean {
  const adminIds = (process.env.ADMIN_USER_IDS || '').split(',').map(id => id.trim())
  return adminIds.includes(userId)
}

export function isAccountTooYoung(createdAt: string, minDays: number = 30): boolean {
  const created = new Date(createdAt)
  const now = new Date()
  const ageInDays = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
  return ageInDays < minDays
}

// Roblox OAuth helpers
const ROBLOX_AUTH_URL = 'https://apis.roblox.com/oauth/v1/authorize'
const ROBLOX_TOKEN_URL = 'https://apis.roblox.com/oauth/v1/token'
const ROBLOX_USERINFO_URL = 'https://apis.roblox.com/oauth/v1/userinfo'

export function getRobloxAuthUrl(state: string, codeChallenge: string, baseUrl?: string): string {
  const clientId = process.env.ROBLOX_CLIENT_ID
  const redirectUri = `${baseUrl || process.env.NEXT_PUBLIC_BASE_URL}/redirect`

  const params = new URLSearchParams({
    client_id: clientId || '',
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })

  return `${ROBLOX_AUTH_URL}?${params.toString()}`
}

export async function exchangeCodeForTokens(code: string, codeVerifier: string, baseUrl?: string): Promise<{
  access_token: string
  refresh_token: string
  expires_in: number
} | null> {
  const clientId = process.env.ROBLOX_CLIENT_ID
  const clientSecret = process.env.ROBLOX_CLIENT_SECRET
  const redirectUri = `${baseUrl || process.env.NEXT_PUBLIC_BASE_URL}/redirect`

  const response = await fetch(ROBLOX_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  })

  if (!response.ok) {
    console.error('Token exchange failed:', await response.text())
    return null
  }

  return response.json()
}

export async function getRobloxUserInfo(accessToken: string): Promise<RobloxUser | null> {
  // Get user ID from OAuth
  const response = await fetch(ROBLOX_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    console.error('Failed to get user info:', await response.text())
    return null
  }

  const data = await response.json()
  const userId = data.sub

  // Fetch full user details from Roblox Users API
  try {
    const userResponse = await fetch(`https://users.roblox.com/v1/users/${userId}`)
    if (userResponse.ok) {
      const userData = await userResponse.json()

      // Fetch avatar from Thumbnails API
      let avatar: string | undefined
      try {
        const avatarResponse = await fetch(
          `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=false`
        )
        if (avatarResponse.ok) {
          const avatarData = await avatarResponse.json()
          avatar = avatarData.data?.[0]?.imageUrl
        }
      } catch (avatarError) {
        console.error('Failed to fetch avatar:', avatarError)
      }

      return {
        id: userId,
        name: userData.name,
        displayName: userData.displayName,
        avatar,
        robloxCreatedAt: userData.created,
      }
    }
  } catch (error) {
    console.error('Failed to fetch user details:', error)
  }

  // Fallback if API fails
  return {
    id: userId,
    name: `User${userId}`,
    displayName: `User ${userId}`,
    avatar: undefined,
  }
}

function generateState(): string {
  return randomUUID()
}

export async function storeOAuthState(provider: 'roblox' | 'discord'): Promise<{ state: string; codeChallenge: string }> {
  const state = generateState()
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = generateCodeChallenge(codeVerifier)
  const cookieStore = await cookies()

  cookieStore.set(`oauth_state_${provider}`, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10,
    path: '/',
  })

  cookieStore.set(`oauth_pkce_${provider}`, codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10,
    path: '/',
  })

  return { state, codeChallenge }
}

export async function validateOAuthState(provider: 'roblox' | 'discord', state: string | null): Promise<boolean> {
  if (!state) return false
  const cookieStore = await cookies()
  const stored = cookieStore.get(`oauth_state_${provider}`)?.value
  cookieStore.delete(`oauth_state_${provider}`)
  return !!stored && stored === state
}

export async function retrieveCodeVerifier(provider: 'roblox' | 'discord'): Promise<string | null> {
  const cookieStore = await cookies()
  const verifier = cookieStore.get(`oauth_pkce_${provider}`)?.value || null
  cookieStore.delete(`oauth_pkce_${provider}`)
  return verifier
}

// Discord OAuth helpers
const DISCORD_AUTH_URL = 'https://discord.com/api/oauth2/authorize'
const DISCORD_TOKEN_URL = 'https://discord.com/api/oauth2/token'
const DISCORD_USER_URL = 'https://discord.com/api/users/@me'

export interface DiscordUser {
  id: string
  username: string
  avatar?: string
  global_name?: string
}

export function getDiscordAuthUrl(state: string, codeChallenge: string): string {
  const clientId = process.env.DISCORD_CLIENT_ID
  const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/discord/callback`

  const params = new URLSearchParams({
    client_id: clientId || '',
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'identify guilds.join',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })

  return `${DISCORD_AUTH_URL}?${params.toString()}`
}

export async function exchangeDiscordCodeForTokens(code: string, codeVerifier: string): Promise<{
  access_token: string
  token_type: string
  expires_in: number
  refresh_token: string
  scope: string
} | null> {
  const clientId = process.env.DISCORD_CLIENT_ID
  const clientSecret = process.env.DISCORD_CLIENT_SECRET
  const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/discord/callback`

  const response = await fetch(DISCORD_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId || '',
      client_secret: clientSecret || '',
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  })

  if (!response.ok) {
    console.error('Discord token exchange failed:', await response.text())
    return null
  }

  return response.json()
}

export async function getDiscordUserInfo(accessToken: string): Promise<DiscordUser | null> {
  const response = await fetch(DISCORD_USER_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    console.error('Failed to get Discord user info:', await response.text())
    return null
  }

  const data = await response.json()

  return {
    id: data.id,
    username: data.username,
    avatar: data.avatar
      ? `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png`
      : undefined,
  }
}

export async function addUserToGuild(accessToken: string, discordUserId: string): Promise<boolean> {
  const botToken = process.env.DISCORD_BOT_TOKEN
  const guildId = process.env.DISCORD_GUILD_ID

  if (!botToken || !guildId) {
    console.error('DISCORD_BOT_TOKEN or DISCORD_GUILD_ID not configured')
    return false
  }

  try {
    const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${discordUserId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ access_token: accessToken }),
    })

    if (response.status === 201) {
      console.log(`Added Discord user ${discordUserId} to guild`)
      return true
    }
    if (response.status === 204) {
      console.log(`Discord user ${discordUserId} already in guild`)
      return true
    }

    console.error(`Failed to add user to guild: ${response.status} ${await response.text()}`)
    return false
  } catch (error) {
    console.error('Error adding user to guild:', error)
    return false
  }
}
