// Brand colors
export const COLORS = {
  accent: '#e1ad2d',
  accentLight: '#f0c040',
  accentDark: '#c2a10e',
  pixelBlue: '#3084b1',
  pixelBlueDark: '#205ad7',
  pixelRed: '#b43824',
} as const

// Shop categories
export const SHOP_CATEGORIES = [
  {
    id: 'items',
    title: 'Items',
    description: 'Snipers and knives traded directly to you via our delivery system.',
    href: '/shop',
    buttonText: 'Browse Items',
    featured: false,
  },
  {
    id: 'gems',
    title: 'Gems',
    description: 'Get your gems in minutes.',
    href: '/gems',
    buttonText: 'Buy Gems',
    featured: true,
  },
  {
    id: 'crates',
    title: 'Crates',
    description: 'Mystery crates with chances for rare items.',
    href: '/shop?category=crates',
    buttonText: 'Browse Crates',
    featured: false,
  },
] as const

// How it works steps
export const HOW_IT_WORKS_STEPS = [
  {
    step: 1,
    title: 'Login with Roblox',
    description: 'Securely connect your Roblox account to get started.',
  },
  {
    step: 2,
    title: 'Browse and Select Items',
    description: 'Choose from our collection of snipers, knives, and crates — gems are available as well.',
  },
  {
    step: 3,
    title: 'Complete Payment',
    description: 'Pay securely through Pandabase.',
  },
  {
    step: 4,
    title: 'Join Private Server',
    description: "You'll receive a link to our private server.",
  },
  {
    step: 5,
    title: 'Accept Bot Trade',
    description: 'Our stock bot will trade you. Just accept and receive your items.',
  },
] as const

// Trust stats (mock data)
export const TRUST_STATS = {
  itemsDelivered: 0,
  averageDeliveryTime: 'Under 2 min',
  uptime: '24/7',
} as const

// Navigation links
export const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Gems', href: '/gems' },
  { label: 'Items', href: '/shop' },
] as const

// Footer links
export const FOOTER_LINKS = {
  support: [
    { label: 'FAQ', href: '/faq' },
    { label: 'Contact Us', href: 'https://discord.gg/sniperduels' },
    { label: 'Discord', href: 'https://discord.gg/sniperduels' },
  ],
  legal: [
    { label: 'Terms and Conditions', href: '/terms' },
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Refund Policy', href: '/refunds' },
  ],
} as const

// Rarity types
export const RARITIES = ['Collectible', 'Knife', 'Secret', 'Epic', 'Legendary', 'Rare', 'Uncommon'] as const
export type Rarity = typeof RARITIES[number]

// FX Effects
export const FX_EFFECTS = ['Ascended', 'Binary', 'Blacklight', 'Cash', 'Darkheart', 'Inferno', 'Loveshot', 'Omega', 'Starbound', 'Surge', 'Void Cry'] as const
export type FxEffect = typeof FX_EFFECTS[number]

// Fragtrak types
export const FRAGTRAK_TYPES = ['Headshots', 'Kills', 'Lower Body', 'Noscope', 'Quickscope'] as const
export type FragtrakType = typeof FRAGTRAK_TYPES[number]
