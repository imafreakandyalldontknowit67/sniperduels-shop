import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'

// Whitelisted programmatic landing pages. Each slug = a long-tail SEO target
// pointing back at the main /gems flow with a prefilled amount or marketing
// angle. Adding new slugs requires updating BOTH this map AND
// `generateStaticParams` below + the sitemap (see app/sitemap.ts).
//
// IMPORTANT: any slug not in this map returns 404 — prevents indexable URL
// spam from arbitrary /gems/whatever paths.
const PROGRAMMATIC_PAGES: Record<string, {
  amount: number | null // null = no amount prefill (informational)
  title: string
  metaDescription: string
  h1: string
  intro: string
  ctaLabel: string
}> = {
  '100k': {
    amount: 100,
    title: 'Buy 100k Sniper Duels Gems — Bulk Price $2.65/k',
    metaDescription: 'Purchase 100,000 Sniper Duels gems at the bulk rate of $2.65/k. Automated delivery within 2 minutes via private Roblox server.',
    h1: 'Buy 100k Sniper Duels Gems',
    intro: '100k gems unlocks the bulk pricing tier at $2.65 per thousand — a $25 saving over the base rate. Most orders deliver in under 2 minutes. Pay by card or crypto, sign in with Roblox, and the bot trades you the gems automatically.',
    ctaLabel: 'Buy 100k Gems',
  },
  '500k': {
    amount: 500,
    title: 'Buy 500k Sniper Duels Gems — $1,325 Bulk Order',
    metaDescription: 'Purchase 500,000 Sniper Duels gems for $1,325 at the bulk rate of $2.65/k. Automated bot delivery, 24/7 availability.',
    h1: 'Buy 500k Sniper Duels Gems',
    intro: 'Maximum platform-tier order: 500k gems at $2.65 per thousand for a total of $1,325. Delivered through our automated trade bot in under 2 minutes once you join the private Roblox server. Vendor listings may offer further bulk discounts.',
    ctaLabel: 'Buy 500k Gems',
  },
  '1m': {
    amount: 500, // platform max — for orders >500k, vendor listings handle the rest
    title: 'Buy 1 Million Sniper Duels Gems',
    metaDescription: 'Looking to buy 1 million Sniper Duels gems? Our marketplace combines platform stock and vendor listings to fulfill large orders with automated delivery.',
    h1: 'Buy 1 Million Sniper Duels Gems',
    intro: 'For orders above 500k, our marketplace splits delivery across the platform stock and vendor listings to keep delivery fast. Pricing starts at $2.65 per thousand for platform stock; vendor rates vary. Combine multiple orders or contact support in Discord for custom large-volume pricing.',
    ctaLabel: 'Browse Gem Listings',
  },
  'cheap': {
    amount: null,
    title: 'Cheap Sniper Duels Gems — From $2.65/k',
    metaDescription: 'Cheap Sniper Duels gems with bulk pricing from $2.65 per thousand. Lowest rates from verified vendors and platform stock with automated delivery.',
    h1: 'Cheap Sniper Duels Gems',
    intro: 'The best price on Sniper Duels gems comes from buying in bulk. Platform pricing starts at $2.90/k and drops to $2.65/k for orders of 100k or more. Verified vendor listings often beat platform pricing for specific quantities — our shop shows the cheapest available rate for your selected amount.',
    ctaLabel: 'See Cheapest Listings',
  },
  'buy': {
    amount: null,
    title: 'Buy Sniper Duels Gems — Automated Delivery in 2 Minutes',
    metaDescription: 'Buy Sniper Duels gems through the first fully automated marketplace. Sign in with Roblox, pay by card or crypto, and the bot trades you the gems within 2 minutes.',
    h1: 'Buy Sniper Duels Gems',
    intro: 'Sniper Duels Auto Shop is the first fully automated marketplace for Sniper Duels gems on Roblox. Sign in with your Roblox account, pick the amount you want, pay by card or crypto, and our trade bot delivers the gems automatically in a private server. No middlemen, no waiting in Discord queues, no risk of getting scammed.',
    ctaLabel: 'Buy Gems Now',
  },
}

const ALLOWED_SLUGS = Object.keys(PROGRAMMATIC_PAGES)

export function generateStaticParams() {
  return ALLOWED_SLUGS.map(amount => ({ amount }))
}

export async function generateMetadata(
  { params }: { params: Promise<{ amount: string }> },
): Promise<Metadata> {
  const { amount } = await params
  const page = PROGRAMMATIC_PAGES[amount]
  if (!page) return { title: 'Not Found' }
  return {
    title: page.title,
    description: page.metaDescription,
    alternates: {
      canonical: `https://sniperduels.shop/gems/${amount}`,
    },
    openGraph: {
      title: page.title,
      description: page.metaDescription,
      url: `https://sniperduels.shop/gems/${amount}`,
      type: 'website',
    },
  }
}

export default async function GemAmountPage(
  { params }: { params: Promise<{ amount: string }> },
) {
  const { amount } = await params
  const page = PROGRAMMATIC_PAGES[amount]
  if (!page) notFound()

  const buyHref = page.amount
    ? `/gems?amount=${page.amount}`
    : '/gems'

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://sniperduels.shop' },
      { '@type': 'ListItem', position: 2, name: 'Gems', item: 'https://sniperduels.shop/gems' },
      { '@type': 'ListItem', position: 3, name: page.h1, item: `https://sniperduels.shop/gems/${amount}` },
    ],
  }

  return (
    <div className="min-h-screen bg-dark-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-accent uppercase mb-6 text-center">
          {page.h1}
        </h1>

        <p className="text-gray-300 text-sm sm:text-base leading-relaxed mb-8 text-center">
          {page.intro}
        </p>

        <div className="flex justify-center mb-12">
          <Link
            href={buyHref}
            className="relative inline-flex items-center justify-center pixel-btn-press"
            style={{ textDecoration: 'none' }}
          >
            <img
              src="/images/pixel/pngs/asset-88.png"
              alt=""
              className="h-[60px] w-auto"
              style={{ imageRendering: 'pixelated' }}
            />
            <span className="absolute inset-0 flex items-center justify-center font-bold text-dark-900 text-xs uppercase tracking-wider px-8">
              {page.ctaLabel}
            </span>
          </Link>
        </div>

        <div className="space-y-8 text-gray-300">
          <section>
            <h2 className="text-xl sm:text-2xl font-bold text-accent uppercase mb-3">
              How delivery works
            </h2>
            <p className="text-sm leading-relaxed">
              After payment, you&apos;ll see a private Roblox server link in your dashboard. Join the
              server and our delivery bot will trade you the gems automatically. The whole process
              usually takes under 2 minutes from payment to gems-in-hand.
            </p>
          </section>

          <section>
            <h2 className="text-xl sm:text-2xl font-bold text-accent uppercase mb-3">
              Why buy through Sniper Duels Auto Shop
            </h2>
            <ul className="text-sm leading-relaxed space-y-2 list-disc list-inside">
              <li>Bulk pricing from $2.65/k — the cheapest verified rates anywhere.</li>
              <li>Automated bot delivery — no Discord middlemen, no waiting hours.</li>
              <li>Wallet-credit protection: if a delivery can&apos;t complete, your USD is credited back to your wallet automatically.</li>
              <li>Roblox OAuth sign-in — we never see your password.</li>
              <li>24/7 availability with live order tracking.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl sm:text-2xl font-bold text-accent uppercase mb-3">
              Pricing tiers
            </h2>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-dark-600">
                  <th className="text-left py-2 text-gray-400 uppercase text-xs">Quantity</th>
                  <th className="text-right py-2 text-gray-400 uppercase text-xs">Rate</th>
                  <th className="text-right py-2 text-gray-400 uppercase text-xs">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-dark-700">
                  <td className="py-2">1k–99k</td>
                  <td className="py-2 text-right">$2.90/k</td>
                  <td className="py-2 text-right">up to $287.10</td>
                </tr>
                <tr className="border-b border-dark-700">
                  <td className="py-2">100k+</td>
                  <td className="py-2 text-right">$2.65/k</td>
                  <td className="py-2 text-right">$265.00 / 100k</td>
                </tr>
                <tr>
                  <td className="py-2 text-accent">Vendor stock</td>
                  <td className="py-2 text-right text-accent">varies</td>
                  <td className="py-2 text-right text-accent">often cheaper</td>
                </tr>
              </tbody>
            </table>
          </section>
        </div>

        <div className="mt-12 flex justify-center">
          <Link
            href={buyHref}
            className="relative inline-flex items-center justify-center pixel-btn-press"
            style={{ textDecoration: 'none' }}
          >
            <img
              src="/images/pixel/pngs/asset-88.png"
              alt=""
              className="h-[60px] w-auto"
              style={{ imageRendering: 'pixelated' }}
            />
            <span className="absolute inset-0 flex items-center justify-center font-bold text-dark-900 text-xs uppercase tracking-wider px-8">
              {page.ctaLabel}
            </span>
          </Link>
        </div>
      </div>
    </div>
  )
}
