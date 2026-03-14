import { Hero, HowItWorks, ShopCategories } from '@/components/home'
import { ScrollReveal } from '@/components/ui'

export default function HomePage() {
  return (
    <>
      <Hero />
      <ScrollReveal animation="pixel-fade-up" threshold={0.02}>
        <HowItWorks />
      </ScrollReveal>
      <ScrollReveal animation="pixel-fade-up" delay={100} threshold={0.02}>
        <ShopCategories />
      </ScrollReveal>
    </>
  )
}
