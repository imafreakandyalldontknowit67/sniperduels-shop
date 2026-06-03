import { Hero, HowItWorks, ShopCategories, TrustSection, OAuthErrorBanner } from '@/components/home'
import { ScrollReveal } from '@/components/ui'
import OutageBanner from '@/components/OutageBanner'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    absolute: 'Sniper Duels Shop — Buy Sniper Duels Gems & Items | Instant Auto Delivery',
  },
}

export default function HomePage() {
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://sniperduels.shop',
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <OAuthErrorBanner />
      <OutageBanner surface="home" />
      <Hero />
      <ScrollReveal animation="pixel-fade-up" threshold={0.02}>
        <HowItWorks />
      </ScrollReveal>
      <ScrollReveal animation="pixel-fade-up" delay={100} threshold={0.02}>
        <ShopCategories />
      </ScrollReveal>
      <ScrollReveal animation="pixel-fade-up" delay={200} threshold={0.02}>
        <TrustSection />
      </ScrollReveal>
    </>
  )
}
