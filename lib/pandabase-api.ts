const API_BASE = 'https://api.pandabase.io/v2/core/stores'

function getConfig() {
  const apiKey = process.env.PANDABASE_API_KEY
  const storeId = process.env.PANDABASE_API_STORE_ID
  if (!apiKey || !storeId) throw new Error('Missing PANDABASE_API_KEY or PANDABASE_API_STORE_ID')
  return { apiKey, storeId }
}

async function pbFetch(path: string) {
  const { apiKey, storeId } = getConfig()
  const res = await fetch(`${API_BASE}/${storeId}/${path}`, {
    headers: { 'Authorization': `Bearer ${apiKey}` },
    next: { revalidate: 60 }, // cache 1 min
  })
  if (!res.ok) throw new Error(`Pandabase API error: ${res.status}`)
  const json = await res.json()
  if (!json.ok) throw new Error(`Pandabase API: ${json.error}`)
  return json.data
}

export type PBPeriod = 'all' | '7d' | '30d' | '90d'

export interface PBAnalytics {
  revenue: { gross: number; net: number; fees: number; refunded: number }
  orders: { total: number; completed: number; pending: number; failed: number; refunded: number }
  averageOrderValue: number
  refundRate: number
}

export async function getPandabaseAnalytics(period: PBPeriod = 'all'): Promise<PBAnalytics> {
  return pbFetch(`analytics/overview?period=${period}`)
}

export interface PBDailyDataPoint {
  date: string
  revenue: number
  orders: number
}

export async function getPandabaseGrossVolume(period: PBPeriod = '30d'): Promise<PBDailyDataPoint[]> {
  const data = await pbFetch(`analytics/gross-volume?period=${period}`)
  return data.dataPoints || []
}

export interface PBPayout {
  id: string
  amount: number
  fee: number
  status: string
  referenceId: string | null
  createdAt: string
  updatedAt: string
}

export async function getPandabasePayouts(): Promise<PBPayout[]> {
  const data = await pbFetch('payouts?limit=100')
  return data.items || []
}
