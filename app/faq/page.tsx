import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'FAQ — How It Works, Payments & Delivery',
  description: 'Frequently asked questions about Sniper Duels Auto Shop. Learn about automated delivery, payment methods, wallet system, account security, and loyalty discounts.',
  alternates: {
    canonical: 'https://sniperduels.shop/faq',
  },
}

const faqData = [
  // General
  { section: 'General', q: 'What is Sniper Duels Auto Shop?', a: 'The first fully automated item shop for the Roblox game Sniper Duels. Browse and purchase snipers, knives, crates, and gems with instant automated delivery.' },
  { section: 'General', q: 'How does the delivery system work?', a: "After purchasing, you'll receive a link to join our private server. Our automated bot will trade you the items directly. The entire process takes under 2 minutes." },
  { section: 'General', q: 'Is this site affiliated with Sniper Duels?', a: 'We are an independent third-party marketplace. We are not affiliated with the developers of Sniper Duels.' },
  { section: 'General', q: 'Is Sniper Duels Auto Shop legit?', a: 'Yes. We use secure payment processing through Pandabase, Roblox OAuth for safe authentication, and our automated bot handles all trades transparently. You can track every order in real-time from your dashboard.' },
  { section: 'General', q: 'How do I contact support?', a: 'Join our Discord server at discord.gg/sniperduels. Our team responds to support requests there. You can also check your order status directly from your dashboard.' },
  // Delivery
  { section: 'Delivery', q: 'How long does delivery take?', a: "Most orders are delivered within 2 minutes. You'll be able to track your order status in real-time from your dashboard." },
  { section: 'Delivery', q: 'What happens after I purchase an item?', a: "You'll see a link to join our private Roblox server. Join the server, and our automated bot will initiate a trade with you. Accept the trade and the items are yours." },
  { section: 'Delivery', q: 'Do I need to be online in Roblox to receive items?', a: 'Yes. You need to join our private server in Roblox to accept the trade from our bot. The server link is provided after purchase.' },
  { section: 'Delivery', q: 'What if the bot is offline or the trade fails?', a: 'If an order cannot be fulfilled, your wallet balance is automatically refunded. You can retry the purchase at any time. Our system runs 24/7 with high uptime.' },
  { section: 'Delivery', q: 'Can I receive items on a different Roblox account?', a: 'No. Items are delivered to the Roblox account you logged in with. Make sure you are logged in with the correct account before purchasing.' },
  // Items & Gems
  { section: 'Items & Gems', q: 'What items do you sell?', a: 'We sell snipers, knives, and crates from the Roblox game Sniper Duels. Each item lists its rarity, FX effects, and Fragtrak details where applicable.' },
  { section: 'Items & Gems', q: 'What are gems used for?', a: 'Gems are the in-game currency for Sniper Duels. They can be used to open crates, purchase items, and more within the game.' },
  { section: 'Items & Gems', q: 'How does gem pricing work?', a: 'Gems are priced per thousand (k). Orders of 1k-99k are $2.90/k. Orders of 100k or more get a bulk discount at $2.65/k.' },
  { section: 'Items & Gems', q: 'Do item prices change?', a: 'Yes. Prices may fluctuate based on rarity, demand, and availability. The price shown on the shop page is always the current price.' },
  { section: 'Items & Gems', q: 'What do the rarity tiers mean?', a: 'Items range from Uncommon to Collectible. Higher rarity items (Secret, Collectible) are rarer and typically more valuable. Each rarity is color-coded on the shop page.' },
  // Payments & Wallet
  { section: 'Payments & Wallet', q: 'How do I add funds to my wallet?', a: "Go to your Dashboard and click 'Deposit'. We accept payments through Pandabase. Funds are credited to your wallet instantly after payment confirmation." },
  { section: 'Payments & Wallet', q: 'What payment methods are accepted?', a: 'We accept credit/debit cards and other methods available through our payment processor Pandabase.' },
  { section: 'Payments & Wallet', q: 'Can I withdraw my balance?', a: 'No. Wallet deposits are non-refundable and can only be used for purchases on our platform. All sales are final.' },
  { section: 'Payments & Wallet', q: 'What is your refund policy?', a: 'All sales are final. If an order cannot be fulfilled due to a technical issue, your wallet balance is automatically refunded to your site wallet. We do not issue refunds to your original payment method. If you have an issue, open a ticket in our Discord.' },
  { section: 'Payments & Wallet', q: 'Why is my balance different than expected?', a: 'Your balance may reflect pending orders or loyalty discounts applied to purchases. Check your order history for details.' },
  // Account & Security
  { section: 'Account & Security', q: 'How do I create an account?', a: "Click 'Login with Roblox' and authorize with your Roblox account. Your account is created automatically — no separate registration needed." },
  { section: 'Account & Security', q: 'Is my Roblox account safe?', a: 'Yes. We only use Roblox OAuth for authentication. We never have access to your Roblox password or account credentials.' },
  { section: 'Account & Security', q: 'Why should I link my Discord?', a: 'Linking Discord gives you a one-time 2.5% discount on your first purchase. It also helps us provide better support.' },
  { section: 'Account & Security', q: 'What is the loyalty program?', a: 'The more you spend, the bigger your discount. Silver tier (after $100 spent) gives 0.5% off, Gold tier (after $250 spent) gives 1% off all purchases.' },
  { section: 'Account & Security', q: 'Can I use the same account on multiple devices?', a: 'Yes. Your account is tied to your Roblox login, so you can access it from any device by logging in with Roblox.' },
]

const sections = ['General', 'Delivery', 'Items & Gems', 'Payments & Wallet', 'Account & Security'] as const

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqData.map(({ q, a }) => ({
    '@type': 'Question',
    name: q,
    acceptedAnswer: { '@type': 'Answer', text: a },
  })),
}

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://sniperduels.shop' },
    { '@type': 'ListItem', position: 2, name: 'FAQ', item: 'https://sniperduels.shop/faq' },
  ],
}

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-dark-900 pt-24 pb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-accent uppercase mb-2">FAQ</h1>
        <p className="text-gray-400 mb-12">Frequently Asked Questions</p>

        {sections.map((section) => {
          const sectionFaqs = faqData.filter((f) => f.section === section)
          return (
            <section key={section} className="mb-10">
              <h2 className="text-xl font-semibold text-accent uppercase mb-4 border-b-[2px] border-dark-500 pb-2">
                {section}
              </h2>
              <div className="space-y-2">
                {sectionFaqs.map(({ q, a }) => (
                  <details key={q} className="group border-[2px] border-dark-500 bg-dark-800 p-4">
                    <summary className="cursor-pointer text-white uppercase font-semibold text-sm list-none flex items-center justify-between">
                      {q}
                      <span className="text-accent group-open:rotate-45 transition-transform text-xl leading-none">+</span>
                    </summary>
                    <p className="text-gray-400 mt-3 text-sm leading-relaxed">
                      {a}
                    </p>
                  </details>
                ))}
              </div>
            </section>
          )
        })}

        {/* Support CTA */}
        <section className="border-[2px] border-accent bg-dark-800 p-8 text-center">
          <h2 className="text-xl font-semibold text-white uppercase mb-3">Still Have Questions?</h2>
          <p className="text-gray-400 mb-5">
            Reach out to us on our Discord server and we&apos;ll be happy to help.
          </p>
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
        </section>
      </div>
    </div>
  )
}
