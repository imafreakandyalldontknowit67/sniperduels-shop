export type Review = {
  author: string
  rating: number
  body: string
  datePublished: string
}

// Paste REAL Discord/site testimonials here when you have them. Each entry
// feeds both the Product Review schema on /gems and the testimonials block
// in the UI. Use initials only for author privacy. Keep body under 240 chars.
//
// IMPORTANT: do NOT add fabricated reviews. Fake review markup violates
// Google's structured-data guidelines and FTC rules on testimonials.
// While this array is empty, the schema cleanly omits review/aggregateRating
// and the on-page testimonials block does not render.
export const REVIEWS: Review[] = []

export function getAggregateRating() {
  if (REVIEWS.length === 0) return null
  const sum = REVIEWS.reduce((acc, r) => acc + r.rating, 0)
  const avg = sum / REVIEWS.length
  return {
    ratingValue: Number(avg.toFixed(1)),
    reviewCount: REVIEWS.length,
    bestRating: 5,
    worstRating: 1,
  }
}
