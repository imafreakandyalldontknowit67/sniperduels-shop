import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About Sniper Duels Auto Shop — Trusted Automated Delivery',
  description: 'Learn about Sniper Duels Auto Shop, the first fully automated marketplace for Sniper Duels items on Roblox. 24/7 automated delivery, secure payments, and community-driven support.',
  alternates: {
    canonical: 'https://sniperduels.shop/about',
  },
}

export default function AboutPage() {
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://sniperduels.shop' },
      { '@type': 'ListItem', position: 2, name: 'About', item: 'https://sniperduels.shop/about' },
    ],
  }

  return (
    <div className="min-h-screen bg-dark-900 pt-24 pb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-accent uppercase mb-2">About Us</h1>
        <p className="text-gray-400 mb-12">Who we are and how we work</p>

        <div className="space-y-10">
          {/* What We Do */}
          <section>
            <h2 className="text-xl font-semibold text-accent uppercase mb-4 border-b-[2px] border-dark-500 pb-2">
              What is Sniper Duels Auto Shop?
            </h2>
            <div className="text-gray-300 text-sm leading-relaxed space-y-4">
              <p>
                Sniper Duels Auto Shop is the first fully automated marketplace for the Roblox game Sniper Duels.
                We sell in-game items including snipers, knives, crates, and gems with instant automated delivery
                available around the clock.
              </p>
              <p>
                Unlike traditional Roblox item sellers that rely on manual trades and Discord middlemen,
                our entire system is automated from purchase to delivery. When you buy an item, our bot handles
                the trade directly — no waiting for a human seller to come online.
              </p>
            </div>
          </section>

          {/* How It Works */}
          <section>
            <h2 className="text-xl font-semibold text-accent uppercase mb-4 border-b-[2px] border-dark-500 pb-2">
              How Automated Delivery Works
            </h2>
            <div className="text-gray-300 text-sm leading-relaxed space-y-4">
              <p>
                After completing your purchase, you receive a link to join our private Roblox server. Once you
                join, our automated stock bot initiates a trade with your account and delivers the items you
                purchased. The entire process typically takes under 2 minutes from payment to items in your inventory.
              </p>
              <p>
                Our system runs 24 hours a day, 7 days a week. There are no business hours, no wait times,
                and no need to coordinate with a seller. Your items are ready whenever you are.
              </p>
            </div>
          </section>

          {/* Payments & Security */}
          <section>
            <h2 className="text-xl font-semibold text-accent uppercase mb-4 border-b-[2px] border-dark-500 pb-2">
              Payments &amp; Security
            </h2>
            <div className="text-gray-300 text-sm leading-relaxed space-y-4">
              <p>
                All payments are processed securely through Pandabase. We accept credit cards, debit cards,
                and other methods supported by our payment processor. Funds are deposited into your wallet
                instantly after payment confirmation.
              </p>
              <p>
                We use Roblox OAuth for authentication — we never see or store your Roblox password.
                Your account security is maintained at all times.
              </p>
            </div>
          </section>

          {/* Community */}
          <section>
            <h2 className="text-xl font-semibold text-accent uppercase mb-4 border-b-[2px] border-dark-500 pb-2">
              Our Community
            </h2>
            <div className="text-gray-300 text-sm leading-relaxed space-y-4">
              <p>
                Our Discord server is the hub of our community. It&apos;s where you can get support,
                see stock updates, request items, and connect with other Sniper Duels players.
                If you ever have an issue with an order, our team responds through Discord.
              </p>
            </div>
            <div className="mt-6">
              <a
                href="https://discord.gg/sniperduels"
                target="_blank"
                rel="noopener noreferrer"
                className="relative inline-flex items-center justify-center pixel-btn-press"
              >
                <img src="/images/pixel/pngs/asset-88.png" alt="" className="h-[52px] sm:h-[58px] w-auto" />
                <span className="absolute inset-0 flex items-center justify-center font-bold text-dark-900 text-[10px] sm:text-xs uppercase tracking-wider">
                  Join Our Discord
                </span>
              </a>
            </div>
          </section>

          {/* Loyalty Program */}
          <section>
            <h2 className="text-xl font-semibold text-accent uppercase mb-4 border-b-[2px] border-dark-500 pb-2">
              Loyalty Program
            </h2>
            <div className="text-gray-300 text-sm leading-relaxed space-y-4">
              <p>
                We reward returning customers. Link your Discord account for a one-time 2.5% discount on
                your first purchase. As you continue to shop, you unlock loyalty tiers — Silver (after $100 spent)
                for 0.5% off, and Gold (after $250 spent) for 1% off all future purchases.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
