'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { CurrencySelector } from '@/components/ui'

export function Footer() {
  const pathname = usePathname()

  const isAppSection = pathname?.startsWith('/dashboard') || pathname?.startsWith('/admin')
  if (isAppSection) return null

  return (
    <footer className="bg-dark-900" style={{ borderTop: '1px solid #2a2a2e' }}>
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="sm:col-span-2 md:col-span-1">
            <Link href="/" className="inline-block mb-3">
              <Image
                src="/images/logo.png"
                alt="Sniper Duels Shop"
                width={120}
                height={48}
                className="h-10 sm:h-12 w-auto"
                style={{ imageRendering: 'pixelated' }}
              />
            </Link>
            <p className="text-gray-400 text-[10px] sm:text-xs uppercase leading-relaxed max-w-[280px] mb-3">
              The first automated item shop for Sniper Duels.
              <br />
              Automatic delivery, available 24/7.
            </p>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-[10px] uppercase">Currency:</span>
              <CurrencySelector compact />
            </div>
          </div>

          {/* About */}
          <div>
            <h3 className="text-white font-bold text-xs uppercase mb-3 sm:mb-4">About</h3>
            <ul className="space-y-2 sm:space-y-3">
              <li>
                <Link href="/faq" className="text-gray-400 hover:text-white text-[10px] sm:text-xs uppercase transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <a href="https://discord.gg/sniperduels" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white text-[10px] sm:text-xs uppercase transition-colors">
                  Contact Us
                </a>
              </li>
            </ul>
          </div>

          {/* Terms */}
          <div>
            <h3 className="text-white font-bold text-xs uppercase mb-3 sm:mb-4">Terms and Conditions</h3>
            <ul className="space-y-2 sm:space-y-3">
              <li>
                <Link href="/terms" className="text-gray-400 hover:text-white text-[10px] sm:text-xs uppercase transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-gray-400 hover:text-white text-[10px] sm:text-xs uppercase transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/refunds" className="text-gray-400 hover:text-white text-[10px] sm:text-xs uppercase transition-colors">
                  Return Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  )
}
