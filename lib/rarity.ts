/**
 * Canonical rarity styling — derived from the in-game game_rarities_config.json
 * BaseColor RGB values (Roblox Lighting colors, 0–1 floats).
 *
 *   Common      rgb(181 181 181)  light gray
 *   Uncommon    rgb(177 238 107)  lime green
 *   Rare        rgb( 79 108 176)  medium blue
 *   Epic        rgb(252 181  17)  gold/orange
 *   Legendary   rgb(208 137 232)  pink-purple
 *   Collectable rgb(103 139 218)  blue-purple
 *   Knife       rgb(229  46  46)  red
 *   Secret      rgb( 53  53  53)  dark gray (shimmer in-game; we apply a
 *                                  silver border to distinguish from Common)
 *
 * These ARE the colors the game uses on inventory tiles — matching them keeps
 * the site visually consistent with the game.
 */

export interface RarityStyle {
  /** Tailwind border class for cards */
  border: string
  /** Tailwind bg-tinted class for image plate / accent fills */
  bg: string
  /** Tailwind text class for labels */
  text: string
  /** Tailwind shadow class for the hover glow */
  glow: string
  /** Bare CSS color (hex) — for inline styles like the small rarity dot */
  dotHex: string
  /** Tier label as shown in UI (Title Case) */
  label: string
  /** Lower is rarer — used for sorting */
  power: number
}

export const RARITY_STYLES: Record<string, RarityStyle> = {
  COMMON: {
    border: 'border-zinc-500/40',
    bg: 'bg-zinc-700/20',
    text: 'text-zinc-300',
    glow: '',
    dotHex: '#b5b5b5',
    label: 'Common',
    power: 1,
  },
  UNCOMMON: {
    border: 'border-lime-500/50',
    bg: 'bg-lime-900/15',
    text: 'text-lime-400',
    glow: 'shadow-lime-500/10',
    dotHex: '#b1ee6b',
    label: 'Uncommon',
    power: 2,
  },
  RARE: {
    border: 'border-blue-500/60',
    bg: 'bg-blue-900/20',
    text: 'text-blue-400',
    glow: 'shadow-blue-500/15',
    dotHex: '#4f6cb0',
    label: 'Rare',
    power: 3,
  },
  EPIC: {
    border: 'border-amber-500/60',
    bg: 'bg-amber-900/20',
    text: 'text-amber-400',
    glow: 'shadow-amber-500/15',
    dotHex: '#fcb511',
    label: 'Epic',
    power: 4,
  },
  LEGENDARY: {
    border: 'border-fuchsia-400/60',
    bg: 'bg-fuchsia-900/20',
    text: 'text-fuchsia-300',
    glow: 'shadow-fuchsia-500/20',
    dotHex: '#d089e8',
    label: 'Legendary',
    power: 5,
  },
  COLLECTABLE: {
    border: 'border-indigo-400/60',
    bg: 'bg-indigo-900/20',
    text: 'text-indigo-300',
    glow: 'shadow-indigo-500/15',
    dotHex: '#678bda',
    label: 'Collectable',
    power: 5,
  },
  KNIFE: {
    border: 'border-red-500/60',
    bg: 'bg-red-900/20',
    text: 'text-red-400',
    glow: 'shadow-red-500/15',
    dotHex: '#e52e2e',
    label: 'Knife',
    power: 5,
  },
  SECRET: {
    // Game base is dark gray with a metallic shimmer. On the web that
    // shimmer can't translate, and #353535 disappears against the
    // dark badge background — bumped to bright silver (#d4d4d8, zinc-300)
    // so the SECRET tag actually reads. Conveys the "premium metallic"
    // intent without going invisible.
    border: 'border-zinc-300/60',
    bg: 'bg-zinc-950',
    text: 'text-zinc-200',
    glow: 'shadow-white/10',
    dotHex: '#d4d4d8',
    label: 'Secret',
    power: 6,
  },
}

export function rarityStyle(r: string | null | undefined): RarityStyle {
  if (!r) return RARITY_STYLES.COMMON
  return RARITY_STYLES[r.toUpperCase()] ?? RARITY_STYLES.COMMON
}

export const RARITY_OPTIONS = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'COLLECTABLE', 'KNIFE', 'SECRET'] as const
