import { ImageResponse } from 'next/og'

/**
 * Shared 1200x630 OpenGraph card for the site's main routes.
 *
 * Brand palette (see tailwind.config.ts / globals.css):
 *   dark-900 #0a0a0b  dark-700 #1a1a1e
 *   accent   #e1ad2d  pixel-blue #3084b1
 *
 * Static text only — do NOT fetch live data here (keeps the route fast and
 * the build green). next/og runs on the Node runtime (the project is not on
 * edge), so no `export const runtime = 'edge'`.
 */

export const OG_SIZE = { width: 1200, height: 630 }
export const OG_CONTENT_TYPE = 'image/png'

const ACCENT = '#e1ad2d'
const BLUE = '#3084b1'
const BG_DARK = '#0a0a0b'
const BG_PANEL = '#121214'

interface Segment {
  text: string
  accent?: boolean
}

/**
 * Render the OG card. `title` is an array of segments so the key phrase can be
 * highlighted in gold. `tagline` is an optional smaller line under the title.
 */
export function renderOgCard(title: Segment[], tagline?: string): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: BG_DARK,
          backgroundImage: `radial-gradient(circle at 18% 12%, rgba(225,173,45,0.16), transparent 42%), radial-gradient(circle at 88% 90%, rgba(48,132,177,0.16), transparent 45%)`,
          padding: '72px 80px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* top: brand row */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: BG_PANEL,
              border: `4px solid ${ACCENT}`,
              borderRadius: 14,
              padding: '14px 26px',
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                marginRight: 18,
                background: ACCENT,
                transform: 'rotate(45deg)',
                borderRadius: 4,
              }}
            />
            <span
              style={{
                fontSize: 38,
                fontWeight: 800,
                color: '#ffffff',
                letterSpacing: 1,
              }}
            >
              Sniper Duels Shop
            </span>
          </div>
        </div>

        {/* middle: big title */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            fontSize: 86,
            fontWeight: 900,
            lineHeight: 1.05,
            color: '#ffffff',
          }}
        >
          {title.map((seg, i) => (
            <span
              key={i}
              style={{ color: seg.accent ? ACCENT : '#ffffff', whiteSpace: 'pre' }}
            >
              {seg.text}
            </span>
          ))}
        </div>

        {/* bottom: tagline + accent bar */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {tagline ? (
            <span style={{ fontSize: 40, color: '#cfcfd6', marginBottom: 22 }}>
              {tagline}
            </span>
          ) : null}
          <div style={{ display: 'flex' }}>
            <div style={{ width: 220, height: 12, background: ACCENT, borderRadius: 6 }} />
            <div style={{ width: 90, height: 12, background: BLUE, borderRadius: 6, marginLeft: 14 }} />
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE }
  )
}
