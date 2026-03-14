export default function TermsPage() {
  return (
    <div className="min-h-screen bg-dark-900 py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-white mb-8">Terms of Service</h1>
        <p className="text-gray-400 mb-8">Last updated: February 2026</p>

        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Agreement to Terms</h2>
            <p className="text-gray-300 leading-relaxed">
              By accessing or using the Sniper Duels Auto Shop operated by Sleuth (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;),
              you agree to be bound by these Terms of Service. If you do not agree to these terms,
              do not use our service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Eligibility</h2>
            <p className="text-gray-300 leading-relaxed">
              You must have a valid Roblox account in good standing to use our service. By using
              our service, you represent that your Roblox account complies with Roblox&apos;s Terms of
              Service and that you are permitted to make purchases.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Service Description</h2>
            <p className="text-gray-300 leading-relaxed">
              We provide an automated marketplace for purchasing and receiving Sniper Duels in-game
              items, gems, and crates. Items are delivered through our automated trading system via
              private servers.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Purchases and Payments</h2>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>All prices are displayed in USD unless otherwise stated</li>
              <li>Payments are processed through our third-party payment provider (Pandabase)</li>
              <li>You are responsible for any fees charged by your payment method</li>
              <li>All sales are final once items are delivered (see our Refund Policy)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Delivery</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              After purchase, you will receive a link to join our private server where our automated
              bot will trade you the items. You must:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>Have trading enabled on your Roblox account</li>
              <li>Accept the trade request from our bot promptly</li>
              <li>Not be trade-banned or restricted on Roblox</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Prohibited Conduct</h2>
            <p className="text-gray-300 leading-relaxed mb-4">You agree not to:</p>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>Use the service for any illegal purpose</li>
              <li>Attempt to exploit, hack, or interfere with our systems</li>
              <li>Use stolen payment methods or engage in fraudulent transactions</li>
              <li>File false chargebacks or payment disputes after receiving items</li>
              <li>Create multiple accounts to abuse promotions or circumvent bans</li>
              <li>Resell items purchased through our service at inflated prices while misrepresenting their source</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Chargebacks and Fraud</h2>
            <p className="text-gray-300 leading-relaxed">
              Filing a chargeback or payment dispute after receiving your items constitutes fraud
              and breach of these terms. We will permanently ban accounts involved in chargebacks
              and reserve the right to pursue recovery of funds and report fraudulent activity to
              relevant authorities.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Account Termination</h2>
            <p className="text-gray-300 leading-relaxed">
              We reserve the right to suspend or terminate your access to our service at any time,
              without notice, for conduct that we believe violates these terms or is harmful to
              other users, us, or third parties.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Disclaimer of Warranties</h2>
            <p className="text-gray-300 leading-relaxed">
              Our service is provided &quot;as is&quot; without warranties of any kind. We do not guarantee
              uninterrupted access or that the service will be error-free. We are not affiliated
              with Roblox Corporation.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Limitation of Liability</h2>
            <p className="text-gray-300 leading-relaxed">
              To the maximum extent permitted by law, Sleuth shall not be liable for any indirect,
              incidental, special, consequential, or punitive damages arising from your use of or
              inability to use the service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Changes to Terms</h2>
            <p className="text-gray-300 leading-relaxed">
              We may update these terms at any time. Continued use of the service after changes
              constitutes acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Contact Us</h2>
            <p className="text-gray-300 leading-relaxed">
              For questions about these Terms of Service, please contact us through our{' '}
              <a
                href="https://discord.gg/sniperduels"
                className="text-accent hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Discord server
              </a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
