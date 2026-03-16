import { Hero, HowItWorks, ShopCategories, TrustSection } from '@/components/home'
import { ScrollReveal } from '@/components/ui'

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
