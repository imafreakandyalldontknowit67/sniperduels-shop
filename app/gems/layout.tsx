import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Buy Sniper Duels Gems — Bulk Pricing from $2.65/k',
  description: 'Purchase Sniper Duels gems in bulk with automated delivery. Tiered pricing starting at $2.90/k, dropping to $2.65/k for 100k+ orders. Delivered within 2 minutes.',
  alternates: {
    canonical: 'https://sniperduels.shop/gems',
  },
}

export default function GemsLayout({ children }: { children: React.ReactNode }) {
  const schemas = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://sniperduels.shop' },
        { '@type': 'ListItem', position: 2, name: 'Gems', item: 'https://sniperduels.shop/gems' },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: 'Sniper Duels Gems',
      description: 'In-game gems for Sniper Duels on Roblox. Buy in bulk for better rates. Automated delivery within 2 minutes.',
      image: 'https://sniperduels.shop/gem_icon.png',
      url: 'https://sniperduels.shop/gems',
      brand: {
        '@type': 'Organization',
        name: 'Sniper Duels Auto Shop',
      },
      category: 'Virtual Game Currency',
      offers: {
        '@type': 'AggregateOffer',
        priceCurrency: 'USD',
        lowPrice: '2.65',
        highPrice: '2.90',
        offerCount: '2',
        url: 'https://sniperduels.shop/gems',
        seller: {
          '@type': 'Organization',
          name: 'Sniper Duels Auto Shop',
        },
      },
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
