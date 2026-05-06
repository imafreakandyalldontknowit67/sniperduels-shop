export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-dark-900 py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-white mb-8">Privacy Policy</h1>
        <p className="text-gray-400 mb-8">Last updated: February 2026</p>

        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Introduction</h2>
            <p className="text-gray-300 leading-relaxed">
              Sleuth (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) operates the Sniper Duels Auto Shop. This Privacy Policy
              explains how we collect, use, and protect your information when you use our service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Information We Collect</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              When you use our service, we collect the following information:
            </p>

            <h3 className="text-xl font-medium text-white mb-2 mt-6">Roblox Account Information</h3>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>Roblox User ID</li>
              <li>Roblox Username and Display Name</li>
              <li>Profile avatar URL</li>
            </ul>

            <h3 className="text-xl font-medium text-white mb-2 mt-6">Discord Information (if linked)</h3>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>Discord User ID</li>
              <li>Discord Username</li>
            </ul>

            <h3 className="text-xl font-medium text-white mb-2 mt-6">Transaction Information</h3>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>Purchase history and order details</li>
              <li>Payment references (we do not store full payment card details)</li>
              <li>Wallet balance and transaction records</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">How We Use Your Information</h2>
            <p className="text-gray-300 leading-relaxed mb-4">We use your information to:</p>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>Process and deliver your purchases</li>
              <li>Maintain your account and wallet balance</li>
              <li>Provide customer support</li>
              <li>Prevent fraud and abuse</li>
              <li>Improve our services</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Information Sharing</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              We do not sell your personal information. We only share your data with:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>
                <strong className="text-white">Payment Processor</strong> (Pandabase) -
                Only the necessary information to process your payments
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Data Security</h2>
            <p className="text-gray-300 leading-relaxed">
              We implement appropriate security measures to protect your information. However, no
              method of transmission over the internet is 100% secure, and we cannot guarantee
              absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Data Retention</h2>
            <p className="text-gray-300 leading-relaxed">
              We retain your account information and transaction history for as long as your account
              is active or as needed to provide services, comply with legal obligations, and resolve
              disputes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Your Rights</h2>
            <p className="text-gray-300 leading-relaxed">
              You may request access to, correction of, or deletion of your personal data by
              contacting us through our Discord server. Note that some data may be retained for
              legal or operational purposes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Contact Us</h2>
            <p className="text-gray-300 leading-relaxed">
              If you have questions about this Privacy Policy, please contact us through our{' '}
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
