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

const ASSET_IDS: Record<string, string> = {
  Kills:           '128872940996269',
  HeadshotKills:   '137013109878768',
  NoscopeKills:    '109196165935503',
  QuickscopeKills: '121356609311584',
  LowerBodyKills:  '128872940996269', // shares the kills icon in-game
  PoolWins:        '120846951139462',
}

const LABELS: Record<string, { label: string; abbr: string }> = {
  Kills:           { label: 'Kills',            abbr: 'K'   },
  HeadshotKills:   { label: 'Headshot Kills',   abbr: 'HS'  },
  NoscopeKills:    { label: 'Noscope Kills',    abbr: 'NS'  },
  QuickscopeKills: { label: 'Quickscope Kills', abbr: 'QS'  },
  LowerBodyKills:  { label: 'Lower Body Kills', abbr: 'LB'  },
  PoolWins:        { label: 'Pool Wins',        abbr: 'PW'  },
}

export function fragtrakInfo(type: string | null | undefined): FragtrakInfo | null {
  if (!type) return null
  const assetId = ASSET_IDS[type]
  const labels = LABELS[type]
  if (!assetId || !labels) return null
  return {
    label: labels.label,
    abbr: labels.abbr,
    iconUrl: `https://www.roblox.com/asset-thumbnail/image?assetId=${assetId}&width=150&height=150&format=png`,
  }
}
