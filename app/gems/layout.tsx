import type { Metadata } from 'next'
import { REVIEWS, getAggregateRating } from '@/lib/seo/reviews'
import { Testimonials } from '@/components/gems/Testimonials'

export const metadata: Metadata = {
  title: 'Buy Sniper Duels Gems — Bulk Pricing from $2.65/k',
  description: 'Purchase Sniper Duels gems in bulk with automated delivery. Tiered pricing starting at $2.90/k, dropping to $2.65/k for 100k+ orders. Delivered within 2 minutes.',
  alternates: {
    canonical: 'https://sniperduels.shop/gems',
  },
  openGraph: {
    // Relative URL resolves against metadataBase (app/layout.tsx) so og:url
    // is the gems page, not the inherited apex. The per-route og:image is
    // auto-injected by app/gems/opengraph-image.tsx.
    url: '/gems',
  },
}

export default function GemsLayout({ children }: { children: React.ReactNode }) {
  const aggregateRating = getAggregateRating()
  const productSchema: Record<string, unknown> = {
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
  }

  if (aggregateRating) {
    productSchema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: aggregateRating.ratingValue,
      reviewCount: aggregateRating.reviewCount,
      bestRating: aggregateRating.bestRating,
      worstRating: aggregateRating.worstRating,
    }
  }

  if (REVIEWS.length > 0) {
    productSchema.review = REVIEWS.map((r) => ({
      '@type': 'Review',
      author: { '@type': 'Person', name: r.author },
      reviewRating: {
        '@type': 'Rating',
        ratingValue: r.rating,
        bestRating: 5,
        worstRating: 1,
      },
      reviewBody: r.body,
      datePublished: r.datePublished,
    }))
  }

  const schemas = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://sniperduels.shop' },
        { '@type': 'ListItem', position: 2, name: 'Gems', item: 'https://sniperduels.shop/gems' },
      ],
    },
    productSchema,
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Is buying Sniper Duels gems on this site safe?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. We use Roblox OAuth for sign-in (we never see your password), Pandabase for payments, and our automated delivery bot trades you the gems directly in a private server. Every step is logged and visible in your dashboard.',
          },
        },
        {
          '@type': 'Question',
          name: 'How fast is gem delivery?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Most orders are delivered in under 2 minutes. After purchase you join our private Roblox server and the bot trades you the gems automatically. You can track queue position in real time from your order page.',
          },
        },
        {
          '@type': 'Question',
          name: 'Do you offer refunds?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Deposits are non-refundable to your original payment method. If a delivery cannot be completed (for example, during a bot outage), the full USD amount is automatically credited back to your platform wallet and can be spent on any future order.',
          },
        },
        {
          '@type': 'Question',
          name: 'What payment methods do you accept?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Credit and debit cards via Pandabase, plus crypto (BTC, ETH, SOL, USDT, USDC, LTC, and 30+ others) via NowPayments. Crypto deposits credit to your wallet 1:1 with no fees.',
          },
        },
        {
          '@type': 'Question',
          name: 'How does bulk gem pricing work?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Pricing tiers are by gem count. 1k–99k is $2.90 per thousand. 100k+ drops to $2.65 per thousand. Some vendor listings offer additional bulk discounts beyond the platform tiers.',
          },
        },
        {
          '@type': 'Question',
          name: 'Do I need a Roblox account to buy?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. You sign in with your Roblox account and receive gems on that same account. Trades cannot be redirected to a different account once a purchase is started.',
          },
        },
        {
          '@type': 'Question',
          name: 'How is this different from buying gems peer-to-peer?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Peer-to-peer trades have no protection — if the seller scams you, you lose your money. Trades on Sniper Duels Auto Shop are bot-delivered and backed by automatic wallet credit if delivery fails. You also get bulk pricing and 24/7 availability.',
          },
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
      {/*
        Server-rendered, crawlable answer text. /gems is a client component so
        its visible body has no quotable copy in the static HTML for search
        engines and AI answer engines. This sr-only paragraph (visually hidden,
        present in the SSR HTML) gives them a direct, citable answer without
        changing the page's visual layout. Mirrors the AggregateOffer schema.
      */}
      <p className="sr-only">
        Sniper Duels gems cost $2.90 per 1,000 gems for orders from 1k to 99k,
        dropping to $2.65 per 1,000 at 100k or more. Every order is auto-delivered
        in under 2 minutes through our private Roblox server, with the full USD
        amount credited back to your wallet if a delivery cannot be completed.
      </p>
      {children}
      <Testimonials />
    </>
  )
}
