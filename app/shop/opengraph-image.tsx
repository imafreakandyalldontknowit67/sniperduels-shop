import { renderOgCard, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/seo/ogCard'

export const alt = 'Sniper Duels Items — Snipers, Knives & Crates'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default function Image() {
  return renderOgCard(
    [
      { text: 'Sniper Duels ' },
      { text: 'Items', accent: true },
    ],
    'Snipers, Knives & Crates — delivered automatically'
  )
}
