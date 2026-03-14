import { Hero, HowItWorks, ShopCategories } from '@/components/home'
import { ScrollReveal } from '@/components/ui'

export default function HomePage() {
  return (
    <>
      <Hero />
      <div className="flex justify-center py-6 sm:py-8 bg-dark-900">
        <img
          src="/images/pixel/pngs/asset-86.png"
          alt=""
          className="h-6 sm:h-8 w-auto animate-arrow-bounce"
        />
      </div>
      <ScrollReveal animation="pixel-fade-up" threshold={0.02}>
        <HowItWorks />
      </ScrollReveal>
      <ScrollReveal animation="pixel-fade-up" delay={100} threshold={0.02}>
        <ShopCategories />
      </ScrollReveal>
    </>
  )
}
