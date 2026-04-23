import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Buy Sniper Duels Items — Snipers, Knives & Crates',
  description: 'Browse and purchase Sniper Duels items with automatic delivery. Snipers, knives, and crates available 24/7. All trades completed within 2 minutes.',
  alternates: {
    canonical: 'https://sniperduels.shop/shop',
  },
}

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  const schemas = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://sniperduels.shop' },
        { '@type': 'ListItem', position: 2, name: 'Shop', item: 'https://sniperduels.shop/shop' },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'OfferCatalog',
      name: 'Sniper Duels Items Shop',
      description: 'Browse snipers, knives, and crates for Sniper Duels on Roblox. All items delivered automatically within 2 minutes.',
      url: 'https://sniperduels.shop/shop',
      itemListElement: [
        {
          '@type': 'OfferCatalog',
          name: 'Snipers',
          description: 'Sniper weapons for Sniper Duels, including rare and collectible variants.',
        },
        {
          '@type': 'OfferCatalog',
          name: 'Knives',
          description: 'Knife melee weapons for Sniper Duels.',
        },
        {
          '@type': 'OfferCatalog',
          name: 'Crates',
          description: 'Mystery crates with chances for rare Sniper Duels items.',
        },
      ],
    },
  ]

  return (
    <>
      {schemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      {children}
    </>
  )
}
