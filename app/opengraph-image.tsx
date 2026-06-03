import { renderOgCard, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/seo/ogCard'

export const alt = 'Sniper Duels Shop — Buy Gems & Items, Instant Delivery'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default function Image() {
  return renderOgCard(
    [
      { text: 'Buy ' },
      { text: 'Gems & Items', accent: true },
      { text: ' — Instant Delivery' },
    ],
    'Sniper Duels Shop — automated 24/7 delivery'
  )
}
