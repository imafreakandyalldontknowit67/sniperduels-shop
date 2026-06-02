/**
 * FragTrakr type icons & labels — sourced from in-game
 * game_fragtrak_icons.json + game_fragtrak_type_names.json. The asset URLs
 * are Roblox thumbnail-API redirects to the actual icon textures.
 *
 * Weapon eligibility (game_fragtrak_available.json):
 *   Sniper: Kills, HeadshotKills, NoscopeKills, QuickscopeKills, LowerBodyKills
 *   Knife:  Kills only
 */

export const FRAGTRAK_TYPES_SNIPER = [
  'Kills',
  'HeadshotKills',
  'NoscopeKills',
  'QuickscopeKills',
  'LowerBodyKills',
] as const

export const FRAGTRAK_TYPES_KNIFE = ['Kills'] as const

export type FragtrakType = typeof FRAGTRAK_TYPES_SNIPER[number]

interface FragtrakInfo {
  /** Display label as the game uses */
  label: string
  /** Short 2-3 char badge label for compact cards */
  abbr: string
  /** Public Roblox thumbnail URL for the icon */
  iconUrl: string
}

// Locally-served icons under /public/items/fragtrak/. The PNGs are pulled
// from Roblox's thumbnail CDN once (real in-game icons). The "Kills" and
// "LowerBodyKills" assets returned an UnavailableImage from Roblox so they
// fall back to clean SVG glyphs.
const ICONS: Record<string, { label: string; abbr: string; iconUrl: string }> = {
  Kills:           { label: 'Kills',            abbr: 'K',  iconUrl: '/items/fragtrak/Kills.svg' },
  HeadshotKills:   { label: 'Headshot Kills',   abbr: 'HS', iconUrl: '/items/fragtrak/HeadshotKills.png' },
  NoscopeKills:    { label: 'Noscope Kills',    abbr: 'NS', iconUrl: '/items/fragtrak/NoscopeKills.png' },
  QuickscopeKills: { label: 'Quickscope Kills', abbr: 'QS', iconUrl: '/items/fragtrak/QuickscopeKills.png' },
  LowerBodyKills:  { label: 'Lower Body Kills', abbr: 'LB', iconUrl: '/items/fragtrak/LowerBodyKills.svg' },
}

export function fragtrakInfo(type: string | null | undefined): FragtrakInfo | null {
  if (!type) return null
  return ICONS[type] ?? null
}
