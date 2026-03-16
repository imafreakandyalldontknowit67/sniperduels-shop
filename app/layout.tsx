import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import { Suspense } from 'react'
import { Header, Footer } from '@/components/layout'
import { AuthProvider, PostHogProvider, PostHogPageView } from '@/components/providers'

const pixelEmulator = localFont({
  src: '../public/fonts/PixelEmulator-xq08.ttf',
  variable: '--font-pixel',
  display: 'swap',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#7ec8e3',
}

export const metadata: Metadata = {
  metadataBase: new URL('https://sniperduels.shop'),
  title: {
    default: 'Sniper Duels Auto Shop — Buy Gems, Items & Crates | Automatic Delivery',
    template: '%s | Sniper Duels Auto Shop',
  },
  description: 'The first automated item shop for Sniper Duels. Purchase gems, items, and crates with automatic 24/7 delivery.',
  keywords: ['Sniper Duels', 'Roblox', 'auto shop', 'gems', 'items', 'automated delivery', 'sniper duels shop', 'buy sniper duels items'],
  icons: {
    icon: '/gem_icon.png',
  },
  alternates: {
    canonical: 'https://sniperduels.shop',
  },
  openGraph: {
    title: 'Sniper Duels Auto Shop — Buy Gems, Items & Crates | Automatic Delivery',
    description: 'The first automated item shop for Sniper Duels. Purchase gems, items, and crates with automatic 24/7 delivery.',
    siteName: 'Sniper Duels Auto Shop',
    url: 'https://sniperduels.shop',
    images: [{ url: '/og-banner.png', width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sniper Duels Auto Shop — Buy Gems, Items & Crates | Automatic Delivery',
    description: 'The first automated item shop for Sniper Duels. Purchase gems, items, and crates with automatic 24/7 delivery.',
    images: ['/og-banner.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`dark ${pixelEmulator.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'Sniper Duels Auto Shop',
              url: 'https://sniperduels.shop',
              logo: 'https://sniperduels.shop/gem_icon.png',
              description: 'The first automated item shop for Sniper Duels. Purchase gems, items, and crates with automatic 24/7 delivery.',
              sameAs: ['https://discord.gg/sniperduels'],
              contactPoint: {
                '@type': 'ContactPoint',
                contactType: 'customer support',
                url: 'https://discord.gg/sniperduels',
              },
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'Sniper Duels Auto Shop',
              url: 'https://sniperduels.shop',
              description: 'The first automated item shop for Sniper Duels. Purchase gems, items, and crates with automatic 24/7 delivery.',
              publisher: {
                '@type': 'Organization',
                name: 'Sniper Duels Auto Shop',
                url: 'https://sniperduels.shop',
              },
            }),
          }}
        />
      </head>
      <body>
        <PostHogProvider>
          <Suspense fallback={null}>
            <PostHogPageView />
          </Suspense>
          <AuthProvider>
            <Header />
            <main className="min-h-screen pt-[56px] sm:pt-[64px] md:pt-[72px]">
              {children}
            </main>
            <Footer />
          </AuthProvider>
        </PostHogProvider>
      </body>
    </html>
  )
}
