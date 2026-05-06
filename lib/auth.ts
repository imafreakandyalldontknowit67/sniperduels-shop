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
  console.log(`[Auth] createSession | user=${session.user.id} jti=${jti.slice(0, 8)}`)
  const token = await new SignJWT({ ...session, lastActivity: now })
    .setProtectedHeader({ alg: 'HS256' })
    .setJti(jti)
    .setIssuedAt(now)
    .setExpirationTime('7d')
    .sign(SESSION_SECRET)
  console.log(`[Auth] createSession OK | user=${session.user.id} jti=${jti.slice(0, 8)} token_len=${token.length}`)
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

  console.log(`[Auth] exchangeCodeForTokens start | redirect_uri=${redirectUri} code_len=${code.length} verifier_len=${codeVerifier.length} client_id=${clientId?.slice(0, 8)}`)

  let response
  try {
    response = await fetch(ROBLOX_TOKEN_URL, {
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
      signal: AbortSignal.timeout(8000),
    })
  } catch (err) {
    console.error(`[Auth] exchangeCodeForTokens NETWORK FAIL: ${String(err)}`)
    return null
  }

  if (!response.ok) {
    const body = await response.text()
    console.error(`[Auth] exchangeCodeForTokens HTTP ${response.status}: ${body.slice(0, 500)}`)
    return null
  }

  const json = await response.json()
  console.log(`[Auth] exchangeCodeForTokens OK | expires_in=${json.expires_in} access_token_len=${json.access_token?.length}`)
  return json
}

export async function getRobloxUserInfo(accessToken: string): Promise<RobloxUser | null> {
  console.log(`[Auth] getRobloxUserInfo start | token_len=${accessToken?.length}`)
  let response
  try {
    response = await fetch(ROBLOX_USERINFO_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      signal: AbortSignal.timeout(8000),
    })
  } catch (err) {
    console.error(`[Auth] getRobloxUserInfo NETWORK FAIL: ${String(err)}`)
    return null
  }

  if (!response.ok) {
    const body = await response.text()
    console.error(`[Auth] getRobloxUserInfo HTTP ${response.status}: ${body.slice(0, 500)}`)
    return null
  }

  const data = await response.json()
  const userId = data.sub
  console.log(`[Auth] getRobloxUserInfo OK | userId=${userId} sub_len=${String(userId).length}`)

  // Fetch full user details from Roblox Users API
  try {
    const userResponse = await fetch(`https://users.roblox.com/v1/users/${userId}`, {
      signal: AbortSignal.timeout(8000),
    })
    if (userResponse.ok) {
      const userData = await userResponse.json()

      // Fetch avatar from Thumbnails API
      let avatar: string | undefined
      try {
        const avatarResponse = await fetch(
          `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=false`,
          { signal: AbortSignal.timeout(8000) }
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

// Whitelisted OAuth state `reason` values. Validate at the entry point so
// arbitrary values can't be injected into the state row.
const ALLOWED_OAUTH_REASONS = ['outage_notify'] as const
export type OAuthReason = typeof ALLOWED_OAUTH_REASONS[number]

export function isAllowedOAuthReason(value: string | null | undefined): value is OAuthReason {
  return typeof value === 'string' && (ALLOWED_OAUTH_REASONS as readonly string[]).includes(value)
}

export async function storeOAuthState(
  provider: 'roblox' | 'discord',
  options: { reason?: OAuthReason; intentId?: string } = {},
): Promise<{ state: string; codeChallenge: string }> {
  const state = generateState()
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = generateCodeChallenge(codeVerifier)

  // Store in DB — cookies don't survive cross-origin redirect chains
  // (Safari ITP, Chrome cookie partitioning strip them during OAuth flows)
  await prisma.oAuthState.create({
    data: {
      state,
      codeVerifier,
      provider,
      reason: options.reason ?? null,
      intentId: options.intentId ?? null,
    },
  })

  // Clean up old states (>15 min)
  prisma.oAuthState.deleteMany({
    where: { createdAt: { lt: new Date(Date.now() - 15 * 60 * 1000) } },
  }).catch(() => {})

  return { state, codeChallenge }
}

export async function validateOAuthState(provider: 'roblox' | 'discord', state: string | null): Promise<'valid' | 'consumed' | 'invalid'> {
  if (!state) return 'invalid'

  try {
    const dbState = await prisma.oAuthState.findUnique({ where: { state } })
    if (!dbState || dbState.provider !== provider) {
      console.error(`[Auth] State not found in DB | state=${state.slice(0, 8)}`)
      return 'invalid'
    }
    if (dbState.consumed) return 'consumed'

    // Claim atomically (prevents duplicate callbacks from double-crediting)
    const claimed = await prisma.oAuthState.updateMany({
      where: { state, consumed: false },
      data: { consumed: true },
    })
    if (claimed.count === 0) return 'consumed'

    console.log(`[Auth] State validated | state=${state.slice(0, 8)}`)
    return 'valid'
  } catch (err) {
    console.error('[Auth] State validation failed:', err)
    return 'invalid'
  }
}

export interface OAuthStateMeta {
  codeVerifier: string
  reason: string | null
  intentId: string | null
}

/**
 * Retrieve the OAuth state row's payload (verifier + any `reason`/`intentId`
 * stored by `storeOAuthState`). Replay protection lives on `consumed=true`
 * (set atomically by `validateOAuthState`) — we deliberately do NOT delete
 * the row here. Deleting on first read causes duplicate callbacks (browser
 * prefetch, bfcache, retry) to see "row missing" instead of "row consumed",
 * which sends them down the `invalid` branch and shows users `?error=invalid_state`
 * even though the original callback succeeded. The cleanup sweep in
 * `storeOAuthState` evicts rows older than 15 min.
 */
export async function retrieveCodeVerifier(
  provider: 'roblox' | 'discord',
  state: string | null,
): Promise<OAuthStateMeta | null> {
  if (!state) return null

  try {
    const dbState = await prisma.oAuthState.findUnique({ where: { state } })
    if (!dbState || dbState.provider !== provider) return null

    return {
      codeVerifier: dbState.codeVerifier,
      reason: dbState.reason,
      intentId: dbState.intentId,
    }
  } catch (err) {
    console.error('[Auth] Code verifier retrieval failed:', err)
    return null
  }
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

  let response: Response
  try {
    response = await fetch(DISCORD_TOKEN_URL, {
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
      signal: AbortSignal.timeout(8000),
    })
  } catch (err) {
    console.error(`[Auth] exchangeDiscordCodeForTokens NETWORK FAIL: ${String(err)}`)
    return null
  }

  if (!response.ok) {
    const body = await response.text()
    console.error(`[Auth] exchangeDiscordCodeForTokens HTTP ${response.status}: ${body.slice(0, 500)}`)
    return null
  }

  return response.json()
}

export async function getDiscordUserInfo(accessToken: string): Promise<DiscordUser | null> {
  let response: Response
  try {
    response = await fetch(DISCORD_USER_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      signal: AbortSignal.timeout(8000),
    })
  } catch (err) {
    console.error(`[Auth] getDiscordUserInfo NETWORK FAIL: ${String(err)}`)
    return null
  }

  if (!response.ok) {
    const body = await response.text()
    console.error(`[Auth] getDiscordUserInfo HTTP ${response.status}: ${body.slice(0, 500)}`)
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
      signal: AbortSignal.timeout(8000),
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
