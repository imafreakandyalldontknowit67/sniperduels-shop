import { renderOgCard, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/seo/ogCard'

export const alt = 'Buy Sniper Duels Gems — from $2.65/k, Auto-Delivered'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default function Image() {
  return renderOgCard(
    [
      { text: 'Buy ' },
      { text: 'Sniper Duels Gems', accent: true },
    ],
    'From $2.65/k — auto-delivered in under 2 minutes'
  )
}
