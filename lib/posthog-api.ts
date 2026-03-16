const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'
const POSTHOG_API_KEY = process.env.POSTHOG_PERSONAL_API_KEY || ''
const POSTHOG_PROJECT_ID = process.env.POSTHOG_PROJECT_ID || '1'

interface PostHogQueryOptions {
  dateFrom?: string
  dateTo?: string
}

async function posthogFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${POSTHOG_HOST}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${POSTHOG_API_KEY}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })
  if (!res.ok) {
    throw new Error(`PostHog API error: ${res.status} ${res.statusText}`)
  }
  return res.json()
}

export async function queryTrend(events: string[], opts: PostHogQueryOptions = {}) {
  return posthogFetch(`/api/projects/${POSTHOG_PROJECT_ID}/insights/trend/`, {
    method: 'POST',
    body: JSON.stringify({
      events: events.map(e => ({ id: e, type: 'events' })),
      date_from: opts.dateFrom || '-7d',
      date_to: opts.dateTo,
      interval: 'day',
    }),
  })
}

export async function queryFunnel(steps: string[], opts: PostHogQueryOptions = {}) {
  return posthogFetch(`/api/projects/${POSTHOG_PROJECT_ID}/insights/funnel/`, {
    method: 'POST',
    body: JSON.stringify({
      events: steps.map(s => ({ id: s, type: 'events', order: 0 })),
      funnel_window_days: 14,
      date_from: opts.dateFrom || '-7d',
      date_to: opts.dateTo,
    }),
  })
}

export async function queryEvents(event: string, limit = 100, opts: PostHogQueryOptions = {}) {
  const params = new URLSearchParams({
    event,
    limit: limit.toString(),
    ...(opts.dateFrom && { after: opts.dateFrom }),
    ...(opts.dateTo && { before: opts.dateTo }),
  })
  return posthogFetch(`/api/projects/${POSTHOG_PROJECT_ID}/events/?${params}`)
}

export async function queryInsight(shortId: string) {
  return posthogFetch(`/api/projects/${POSTHOG_PROJECT_ID}/insights/?short_id=${shortId}`)
}

export async function queryPersons(search?: string, limit = 100) {
  const params = new URLSearchParams({ limit: limit.toString() })
  if (search) params.set('search', search)
  return posthogFetch(`/api/projects/${POSTHOG_PROJECT_ID}/persons/?${params}`)
}

export async function querySessionCount(opts: PostHogQueryOptions = {}) {
  return queryTrend(['$pageview'], opts)
}
