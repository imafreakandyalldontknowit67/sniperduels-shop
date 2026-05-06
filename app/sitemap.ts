import type { MetadataRoute } from 'next'

// Keep this list in sync with the PROGRAMMATIC_PAGES whitelist in
// app/gems/[amount]/page.tsx.
const PROGRAMMATIC_GEM_SLUGS = ['100k', '500k', '1m', 'cheap', 'buy'] as const

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://sniperduels.shop'
  const now = new Date()

  return [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/shop`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/gems`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    ...PROGRAMMATIC_GEM_SLUGS.map(slug => ({
      url: `${baseUrl}/gems/${slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    {
      url: `${baseUrl}/faq`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/refunds`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]
}
