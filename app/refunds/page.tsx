export default function RefundsPage() {
  return (
    <div className="min-h-screen bg-dark-900 py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-white mb-8">Refund Policy</h1>
        <p className="text-gray-400 mb-8">Last updated: February 2026</p>

        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">All Sales Are Final</h2>
            <p className="text-gray-300 leading-relaxed">
              Due to the nature of digital goods and in-game item trading, all purchases made through
              Sleuth (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) are final and non-refundable once the items have been delivered
              to your Roblox account.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Why We Cannot Offer Refunds</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              Once a trade is completed and items are transferred to your account:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>The digital items become your property within Roblox</li>
              <li>We cannot retrieve or reverse traded items</li>
              <li>The transaction is permanently recorded on our systems</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Exceptions</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              We may consider compensation or store credit in the following rare circumstances:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>You received the wrong item due to an error on our part</li>
              <li>A technical issue prevented delivery of your purchased items</li>
              <li>Duplicate charges occurred due to payment processing errors</li>
            </ul>
            <p className="text-gray-300 leading-relaxed mt-4">
              These cases are reviewed individually and require proof of the issue.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Chargebacks</h2>
            <p className="text-gray-300 leading-relaxed">
              Filing a chargeback or payment dispute after receiving your items is considered fraud.
              Users who initiate chargebacks will be permanently banned from our services, and we
              reserve the right to pursue recovery of funds through appropriate channels.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Contact Us</h2>
            <p className="text-gray-300 leading-relaxed">
              If you believe you have a valid case for an exception, please contact us through our{' '}
              <a
                href="https://discord.gg/sniperduels"
                className="text-accent hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Discord server
              </a>
              . Include your Roblox username, order details, and a description of the issue.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
