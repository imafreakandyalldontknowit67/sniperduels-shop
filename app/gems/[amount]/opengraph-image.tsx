import { ImageResponse } from 'next/og'
import { readFileSync } from 'fs'
import { join } from 'path'

export const runtime = 'nodejs'
export const alt = 'Sniper Duels Auto Shop'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const PAGE_DATA: Record<string, { h1: string; tagline: string }> = {
  '100k':  { h1: 'Buy 100k Sniper Duels Gems',       tagline: 'Bulk rate $2.65/k — Automated delivery in 2 minutes' },
  '500k':  { h1: 'Buy 500k Sniper Duels Gems',       tagline: '$1,325 bulk order — 24/7 automated bot delivery' },
  '1m':    { h1: 'Buy 1 Million Sniper Duels Gems',  tagline: 'Large orders via platform + vendor listings' },
  'cheap': { h1: 'Cheap Sniper Duels Gems',          tagline: 'From $2.65/k — Lowest verified rates anywhere' },
  'buy':   { h1: 'Buy Sniper Duels Gems',            tagline: 'Automated delivery in 2 minutes — No middlemen' },
}

export default function Image({ params }: { params: { amount: string } }) {
  const page = PAGE_DATA[params.amount] ?? PAGE_DATA['buy']

  const logoData = readFileSync(join(process.cwd(), 'public/images/logo.png'))
  const logoSrc = `data:image/png;base64,${logoData.toString('base64')}`

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          background: '#0a0a0a',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {/* Gold border frame */}
        <div
          style={{
            position: 'absolute',
            top: '20px', right: '20px', bottom: '20px', left: '20px',
            border: '2px solid #B8860B',
            borderRadius: '4px',
          }}
        />

        {/* Corner accents */}
        <div style={{ position: 'absolute', top: '30px', left: '30px', width: '24px', height: '24px', borderTop: '3px solid #FFD700', borderLeft: '3px solid #FFD700' }} />
        <div style={{ position: 'absolute', top: '30px', right: '30px', width: '24px', height: '24px', borderTop: '3px solid #FFD700', borderRight: '3px solid #FFD700' }} />
        <div style={{ position: 'absolute', bottom: '30px', left: '30px', width: '24px', height: '24px', borderBottom: '3px solid #FFD700', borderLeft: '3px solid #FFD700' }} />
        <div style={{ position: 'absolute', bottom: '30px', right: '30px', width: '24px', height: '24px', borderBottom: '3px solid #FFD700', borderRight: '3px solid #FFD700' }} />

        {/* Logo */}
        <img
          src={logoSrc}
          width={300}
          height={141}
          style={{ objectFit: 'contain', marginBottom: '28px' }}
        />

        {/* Headline */}
        <div
          style={{
            color: '#FFD700',
            fontSize: '54px',
            fontWeight: 'bold',
            textAlign: 'center',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            lineHeight: 1.1,
            marginBottom: '14px',
            maxWidth: '960px',
            display: 'flex',
          }}
        >
          {page.h1}
        </div>

        {/* Tagline */}
        <div
          style={{
            color: '#9ca3af',
            fontSize: '26px',
            textAlign: 'center',
            maxWidth: '840px',
            lineHeight: 1.3,
            display: 'flex',
          }}
        >
          {page.tagline}
        </div>

        {/* Domain badge */}
        <div
          style={{
            position: 'absolute',
            bottom: '38px',
            right: '52px',
            color: '#B8860B',
            fontSize: '18px',
            letterSpacing: '1px',
            display: 'flex',
          }}
        >
          sniperduels.shop
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  )
}
