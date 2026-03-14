import { TRUST_STATS } from '@/lib/constants'

export function TrustSection() {
  return (
    <section id="trust" className="py-24 bg-dark-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <StatCard
            value={TRUST_STATS.averageDeliveryTime}
            label="Average Delivery"
          />
          <StatCard
            value={TRUST_STATS.uptime}
            label="Availability"
          />
          <StatCard
            value="Automatic"
            label="Delivery System"
          />
        </div>

        {/* Payment Partners */}
        <div className="text-center pt-8 border-t-[2px] border-dark-600">
          <div className="flex flex-wrap items-center justify-center gap-6 mb-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-dark-700/50 border-[2px] border-dark-500">
              <span className="text-gray-300 text-xs uppercase">Pandabase</span>
            </div>
          </div>
          <p className="text-gray-500 text-xs uppercase">
            Secure transactions - Private server delivery - Fast & reliable
          </p>
        </div>
      </div>
    </section>
  )
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center p-8 bg-dark-700 border-[2px] border-accent pixel-shadow">
      <div className="text-2xl sm:text-3xl font-bold text-accent mb-1 uppercase">{value}</div>
      <div className="text-gray-400 text-xs uppercase">{label}</div>
    </div>
  )
}
