import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Buy Sniper Duels Items — Snipers, Knives & Crates',
  description: 'Browse and purchase Sniper Duels items with automatic delivery. Snipers, knives, and crates available 24/7. All trades completed within 2 minutes.',
  alternates: {
    canonical: 'https://sniperduels.shop/shop',
  },
}

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://sniperduels.shop' },
      { '@type': 'ListItem', position: 2, name: 'Shop', item: 'https://sniperduels.shop/shop' },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {children}
    </>
  )
}
