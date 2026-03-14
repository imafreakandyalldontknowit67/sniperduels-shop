import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Header, Footer } from '@/components/layout'
import { AuthProvider } from '@/components/providers'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export const metadata: Metadata = {
  title: 'Sniper Duels Shop',
  description: 'The first automated item shop for Sniper Duels. Purchase gems, items, and crates with automatic 24/7 delivery.',
  keywords: ['Sniper Duels', 'Roblox', 'auto shop', 'gems', 'items', 'automated delivery'],
  icons: {
    icon: '/gem_icon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body>
        <AuthProvider>
          <Header />
          <main className="min-h-screen pt-[56px] sm:pt-[64px] md:pt-[72px]">
            {children}
          </main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  )
}
