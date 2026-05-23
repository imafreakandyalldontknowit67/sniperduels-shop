import { REVIEWS, getAggregateRating } from '@/lib/seo/reviews'

export function Testimonials() {
  if (REVIEWS.length === 0) return null
  const rating = getAggregateRating()

  return (
    <section
      id="testimonials"
      aria-labelledby="testimonials-heading"
      className="py-16 sm:py-20 bg-dark-800 border-t-[2px] border-dark-600"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2
            id="testimonials-heading"
            className="text-2xl sm:text-3xl font-bold text-accent uppercase tracking-wider mb-3"
          >
            What buyers are saying
          </h2>
          {rating && (
            <p className="text-gray-300 text-sm uppercase">
              <span className="text-accent font-bold">
                {rating.ratingValue.toFixed(1)}
              </span>
              <span aria-hidden="true"> ★ </span>
              <span className="text-gray-500">
                avg from {rating.reviewCount} verified buyer
                {rating.reviewCount === 1 ? '' : 's'}
              </span>
            </p>
          )}
        </div>

        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {REVIEWS.map((r, i) => (
            <li
              key={i}
              className="bg-dark-700 border-[2px] border-dark-500 p-6 pixel-shadow flex flex-col"
            >
              <div
                className="text-accent text-base mb-3 tracking-wide"
                aria-label={`Rated ${r.rating} out of 5`}
              >
                {'★'.repeat(r.rating)}
                <span className="text-dark-500">
                  {'★'.repeat(5 - r.rating)}
                </span>
              </div>
              <blockquote className="text-gray-200 text-sm leading-relaxed flex-1 mb-4">
                “{r.body}”
              </blockquote>
              <footer className="flex items-center justify-between text-xs uppercase tracking-wider text-gray-500">
                <cite className="not-italic text-gray-300 font-bold">{r.author}</cite>
                <time dateTime={r.datePublished}>
                  {new Date(r.datePublished).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </time>
              </footer>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
