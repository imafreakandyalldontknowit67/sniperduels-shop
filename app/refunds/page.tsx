export default function RefundsPage() {
  return (
    <div className="min-h-screen bg-dark-900 py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-white mb-2">Refund Policy</h1>
        <p className="text-red-400 font-bold text-lg uppercase mb-2">All Sales Are Final — No Refunds</p>
        <p className="text-gray-400 mb-8">Last updated: March 2026</p>

        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">No Refunds Policy</h2>
            <p className="text-gray-300 leading-relaxed">
              All purchases made through Sniper Duels Auto Shop (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) are <strong className="text-white">final and non-refundable</strong>.
              This includes wallet deposits, gem purchases, item purchases, and crate purchases. Due to the nature of digital goods
              and in-game item trading, once a transaction is completed, it cannot be reversed.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Wallet Deposits</h2>
            <p className="text-gray-300 leading-relaxed">
              Funds deposited into your wallet are <strong className="text-white">non-refundable and cannot be withdrawn back to your original payment method</strong>.
              Deposited funds can only be used to make purchases on our platform. By completing a deposit, you acknowledge and accept this.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Undelivered Orders</h2>
            <p className="text-gray-300 leading-relaxed">
              If an order cannot be fulfilled due to a technical issue, bot downtime, or stock unavailability, your
              wallet balance is <strong className="text-white">automatically refunded to your site wallet</strong> (not to your original payment method).
              No action is required on your part.
            </p>
          </section>

          <section className="bg-red-500/10 border border-red-500/30 p-6 rounded-lg">
            <h2 className="text-2xl font-semibold text-red-400 mb-4">Chargebacks &amp; Disputes — Zero Tolerance</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              Filing a chargeback, payment dispute, or claim with your bank or payment provider after receiving your items
              or depositing funds is considered <strong className="text-white">fraud</strong>. We maintain a strict zero-tolerance policy:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li><strong className="text-white">Permanent ban</strong> from all our services, effective immediately</li>
              <li><strong className="text-white">All transaction evidence</strong> (IP address, device fingerprint, timestamps, delivery confirmation, Roblox account data) is submitted to the payment processor to contest the dispute</li>
              <li><strong className="text-white">Blacklisted</strong> across our platform — no new accounts, no future access</li>
              <li>We reserve the right to <strong className="text-white">report fraudulent chargebacks to law enforcement</strong> and pursue recovery of funds through appropriate legal channels</li>
            </ul>
          </section>

          <section className="bg-accent/10 border border-accent/30 p-6 rounded-lg">
            <h2 className="text-2xl font-semibold text-accent mb-4">Have an Issue? Contact Us First</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              If you experience any problem with your order or deposit, <strong className="text-white">do NOT file a dispute with your bank</strong>.
              Instead, open a support ticket in our Discord server. We resolve most issues within minutes.
            </p>
            <p className="text-gray-300 leading-relaxed">
              We handle issues including: wrong items received, technical delivery failures, duplicate charges, and account problems.
              Contact us first and we will make it right.
            </p>
            <a
              href="https://discord.gg/sniperduels"
              className="inline-block mt-4 px-6 py-3 bg-accent hover:bg-accent-light text-black font-bold text-sm uppercase rounded-lg transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open a Discord Ticket
            </a>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Payment Processor Terms</h2>
            <p className="text-gray-300 leading-relaxed">
              All payments are processed through Pandabase. By making a purchase, you also agree to{' '}
              <a
                href="https://pandabase.io/legal/purchase-terms/"
                className="text-accent hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Pandabase&apos;s Purchase Terms
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Transaction Records</h2>
            <p className="text-gray-300 leading-relaxed">
              All transactions are permanently logged with associated metadata including IP address, device information,
              timestamps, payment method details, delivery confirmation, and linked Roblox account. These records are
              retained and may be used as evidence in the event of a dispute.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
