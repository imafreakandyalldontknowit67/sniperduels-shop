export default function FAQPage() {
  return (
    <div className="min-h-screen bg-dark-900 pt-24 pb-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-accent uppercase mb-2">FAQ</h1>
        <p className="text-gray-400 mb-12">Frequently Asked Questions</p>

        {/* General */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-accent uppercase mb-4 border-b-[2px] border-dark-500 pb-2">
            General
          </h2>
          <div className="space-y-2">
            <details className="group border-[2px] border-dark-500 bg-dark-800 p-4">
              <summary className="cursor-pointer text-white uppercase font-semibold text-sm list-none flex items-center justify-between">
                What is Sniper Duels Auto Shop?
                <span className="text-accent group-open:rotate-45 transition-transform text-xl leading-none">+</span>
              </summary>
              <p className="text-gray-400 mt-3 text-sm leading-relaxed">
                The first fully automated item shop for the Roblox game Sniper Duels. Browse and purchase snipers, knives, crates, and gems with instant automated delivery.
              </p>
            </details>

            <details className="group border-[2px] border-dark-500 bg-dark-800 p-4">
              <summary className="cursor-pointer text-white uppercase font-semibold text-sm list-none flex items-center justify-between">
                How does the delivery system work?
                <span className="text-accent group-open:rotate-45 transition-transform text-xl leading-none">+</span>
              </summary>
              <p className="text-gray-400 mt-3 text-sm leading-relaxed">
                After purchasing, you&apos;ll receive a link to join our private server. Our automated bot will trade you the items directly. The entire process takes under 2 minutes.
              </p>
            </details>

            <details className="group border-[2px] border-dark-500 bg-dark-800 p-4">
              <summary className="cursor-pointer text-white uppercase font-semibold text-sm list-none flex items-center justify-between">
                How long does delivery take?
                <span className="text-accent group-open:rotate-45 transition-transform text-xl leading-none">+</span>
              </summary>
              <p className="text-gray-400 mt-3 text-sm leading-relaxed">
                Most orders are delivered within 2 minutes. You&apos;ll be able to track your order status in real-time from your dashboard.
              </p>
            </details>

            <details className="group border-[2px] border-dark-500 bg-dark-800 p-4">
              <summary className="cursor-pointer text-white uppercase font-semibold text-sm list-none flex items-center justify-between">
                Is this site affiliated with Sniper Duels?
                <span className="text-accent group-open:rotate-45 transition-transform text-xl leading-none">+</span>
              </summary>
              <p className="text-gray-400 mt-3 text-sm leading-relaxed">
                We are an independent third-party marketplace. We are not affiliated with the developers of Sniper Duels.
              </p>
            </details>
          </div>
        </section>

        {/* Payments & Wallet */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-accent uppercase mb-4 border-b-[2px] border-dark-500 pb-2">
            Payments &amp; Wallet
          </h2>
          <div className="space-y-2">
            <details className="group border-[2px] border-dark-500 bg-dark-800 p-4">
              <summary className="cursor-pointer text-white uppercase font-semibold text-sm list-none flex items-center justify-between">
                How do I add funds to my wallet?
                <span className="text-accent group-open:rotate-45 transition-transform text-xl leading-none">+</span>
              </summary>
              <p className="text-gray-400 mt-3 text-sm leading-relaxed">
                Go to your Dashboard and click &apos;Deposit&apos;. We accept payments through Pandabase. Funds are credited to your wallet instantly after payment confirmation.
              </p>
            </details>

            <details className="group border-[2px] border-dark-500 bg-dark-800 p-4">
              <summary className="cursor-pointer text-white uppercase font-semibold text-sm list-none flex items-center justify-between">
                What payment methods are accepted?
                <span className="text-accent group-open:rotate-45 transition-transform text-xl leading-none">+</span>
              </summary>
              <p className="text-gray-400 mt-3 text-sm leading-relaxed">
                We accept credit/debit cards and other methods available through our payment processor Pandabase.
              </p>
            </details>

            <details className="group border-[2px] border-dark-500 bg-dark-800 p-4">
              <summary className="cursor-pointer text-white uppercase font-semibold text-sm list-none flex items-center justify-between">
                Can I withdraw my balance?
                <span className="text-accent group-open:rotate-45 transition-transform text-xl leading-none">+</span>
              </summary>
              <p className="text-gray-400 mt-3 text-sm leading-relaxed">
                Yes. Contact us through our Discord server to request a withdrawal.
              </p>
            </details>

            <details className="group border-[2px] border-dark-500 bg-dark-800 p-4">
              <summary className="cursor-pointer text-white uppercase font-semibold text-sm list-none flex items-center justify-between">
                What is your refund policy?
                <span className="text-accent group-open:rotate-45 transition-transform text-xl leading-none">+</span>
              </summary>
              <p className="text-gray-400 mt-3 text-sm leading-relaxed">
                If an order cannot be fulfilled, your wallet balance will be automatically refunded. For other refund requests, please contact us on Discord.
              </p>
            </details>

            <details className="group border-[2px] border-dark-500 bg-dark-800 p-4">
              <summary className="cursor-pointer text-white uppercase font-semibold text-sm list-none flex items-center justify-between">
                Why is my balance different than expected?
                <span className="text-accent group-open:rotate-45 transition-transform text-xl leading-none">+</span>
              </summary>
              <p className="text-gray-400 mt-3 text-sm leading-relaxed">
                Your balance may reflect pending orders or loyalty discounts applied to purchases. Check your order history for details.
              </p>
            </details>
          </div>
        </section>

        {/* Account & Security */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-accent uppercase mb-4 border-b-[2px] border-dark-500 pb-2">
            Account &amp; Security
          </h2>
          <div className="space-y-2">
            <details className="group border-[2px] border-dark-500 bg-dark-800 p-4">
              <summary className="cursor-pointer text-white uppercase font-semibold text-sm list-none flex items-center justify-between">
                How do I create an account?
                <span className="text-accent group-open:rotate-45 transition-transform text-xl leading-none">+</span>
              </summary>
              <p className="text-gray-400 mt-3 text-sm leading-relaxed">
                Click &apos;Login with Roblox&apos; and authorize with your Roblox account. Your account is created automatically — no separate registration needed.
              </p>
            </details>

            <details className="group border-[2px] border-dark-500 bg-dark-800 p-4">
              <summary className="cursor-pointer text-white uppercase font-semibold text-sm list-none flex items-center justify-between">
                Is my Roblox account safe?
                <span className="text-accent group-open:rotate-45 transition-transform text-xl leading-none">+</span>
              </summary>
              <p className="text-gray-400 mt-3 text-sm leading-relaxed">
                Yes. We only use Roblox OAuth for authentication. We never have access to your Roblox password or account credentials.
              </p>
            </details>

            <details className="group border-[2px] border-dark-500 bg-dark-800 p-4">
              <summary className="cursor-pointer text-white uppercase font-semibold text-sm list-none flex items-center justify-between">
                Why should I link my Discord?
                <span className="text-accent group-open:rotate-45 transition-transform text-xl leading-none">+</span>
              </summary>
              <p className="text-gray-400 mt-3 text-sm leading-relaxed">
                Linking Discord gives you a one-time 2.5% discount on your first purchase. It also helps us provide better support.
              </p>
            </details>

            <details className="group border-[2px] border-dark-500 bg-dark-800 p-4">
              <summary className="cursor-pointer text-white uppercase font-semibold text-sm list-none flex items-center justify-between">
                What is the loyalty program?
                <span className="text-accent group-open:rotate-45 transition-transform text-xl leading-none">+</span>
              </summary>
              <p className="text-gray-400 mt-3 text-sm leading-relaxed">
                The more you spend, the bigger your discount. Silver tier (after $100 spent) gives 0.5% off, Gold tier (after $250 spent) gives 1% off all purchases.
              </p>
            </details>
          </div>
        </section>

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
            className="inline-block bg-accent text-dark-900 font-bold uppercase px-6 py-3 text-sm hover:brightness-110 transition-all"
          >
            Join Our Discord
          </a>
        </section>
      </div>
    </div>
  )
}
