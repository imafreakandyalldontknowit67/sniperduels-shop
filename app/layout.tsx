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
  title: 'sniperduels.shop',
  description: 'The first automated item shop for Sniper Duels. Purchase gems, items, and crates with automatic 24/7 delivery.',
  keywords: ['Sniper Duels', 'Roblox', 'auto shop', 'gems', 'items', 'automated delivery'],
  icons: {
    icon: '/gem_icon.png',
  },
  openGraph: {
    title: 'sniperduels.shop',
    description: 'The first automated item shop for Sniper Duels. Purchase gems, items, and crates with automatic 24/7 delivery.',
    siteName: 'sniperduels.shop',
    url: 'https://sniperduels.shop',
    images: [{ url: '/og-banner.png', width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'sniperduels.shop',
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
