/**
 * Sales tax estimation for the deposit page.
 *
 * Rates were calibrated against 65 real Pandabase orders on 2026-05-02 — see
 * pandabase-calibration scripts. For US states we observed in that sample, the
 * `effective` rate is the actual rate Pandabase charged (state base, not state
 * + local — Pandabase doesn't seem to pile city surtax on top in most states).
 * For US states we haven't seen yet, we use the state base rate from public
 * 2025 Tax Foundation data and mark `source: 'estimate'`. Internationally we
 * have data points for UK / DE / AU / NZ / CA / RS where Pandabase charges
 * full VAT/GST.
 *
 * Pandabase computes the exact tax at the pay page based on the customer's
 * billing address. Our preview is "estimate, may differ by a few cents".
 */

export type Region = {
  code: string         // e.g. 'US-TX', 'GB', 'CA-ON'
  label: string        // human-readable
  rate: number         // 0.0625 = 6.25%
  source: 'calibrated' | 'estimate' | 'none'
  group: 'us' | 'intl' | 'none'
}

// Calibrated from 2026-05-02 Pandabase scrape (n=65, see calibrated_tax_rates.json)
const CALIBRATED: Record<string, number> = {
  // US — observed effective rates
  'US-AZ': 0.0661, 'US-CA': 0.0633, 'US-CO': 0.0292, 'US-CT': 0.0603,
  'US-FL': 0.05,   'US-GA': 0.0399, 'US-IL': 0.0626, 'US-IN': 0.0779,
  'US-MO': 0.0422, 'US-NC': 0.0575, 'US-NY': 0.04,   'US-OH': 0.0549,
  'US-SD': 0.0422, 'US-TN': 0.07,   'US-TX': 0.0625, 'US-VA': 0.0741,
  'US-WA': 0.065,
  // International — observed effective rates (Pandabase charges full VAT/GST)
  'GB':    0.20,                     // UK VAT 20%
  'DE':    0.19,                     // Germany VAT 19%
  'RS':    0.20,                     // Serbia VAT 20%
  'AU-NSW': 0.10, 'AU-QLD': 0.10, 'AU-VIC': 0.10, 'AU-SA': 0.10,  // AU GST 10%
  'NZ':    0.15,                     // NZ GST 15%
  'CA-ON': 0.098,                    // Canada HST/GST varies; observed avg
}

// Tax Foundation 2025 state base rates — used when we have no Pandabase sample
const TF_US_BASE: Record<string, number> = {
  AL: 0.04,    AK: 0,       AZ: 0.056,   AR: 0.065,   CA: 0.06,    CO: 0.029,
  CT: 0.0635,  DE: 0,       FL: 0.06,    GA: 0.04,    HI: 0.04,    ID: 0.06,
  IL: 0.0625,  IN: 0.07,    IA: 0.06,    KS: 0.065,   KY: 0.06,    LA: 0.0445,
  ME: 0.055,   MD: 0.06,    MA: 0.0625,  MI: 0.06,    MN: 0.06875, MS: 0.07,
  MO: 0.04225, MT: 0,       NE: 0.055,   NV: 0.0685,  NH: 0,       NJ: 0.06625,
  NM: 0.05,    NY: 0.04,    NC: 0.0475,  ND: 0.05,    OH: 0.0575,  OK: 0.045,
  OR: 0,       PA: 0.06,    RI: 0.07,    SC: 0.06,    SD: 0.045,   TN: 0.07,
  TX: 0.0625,  UT: 0.0485,  VT: 0.06,    VA: 0.053,   WA: 0.065,   WV: 0.06,
  WI: 0.05,    WY: 0.04,    DC: 0.06,
}

const US_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  DC: 'Washington D.C.',
}

const INTL_LABELS: Record<string, string> = {
  'GB':     'United Kingdom (VAT 20%)',
  'DE':     'Germany (VAT 19%)',
  'AU-NSW': 'Australia — New South Wales (GST 10%)',
  'AU-QLD': 'Australia — Queensland (GST 10%)',
  'AU-VIC': 'Australia — Victoria (GST 10%)',
  'AU-SA':  'Australia — South Australia (GST 10%)',
  'NZ':     'New Zealand (GST 15%)',
  'CA-ON':  'Canada — Ontario (HST 13%)',
  'RS':     'Serbia (VAT 20%)',
}

export const REGIONS: Region[] = [
  // US states — calibrated where we have data, Tax Foundation otherwise
  ...Object.keys(US_NAMES).sort().map<Region>(code => {
    const key = `US-${code}`
    if (CALIBRATED[key] !== undefined) {
      return { code: key, label: `${US_NAMES[code]} (~${(CALIBRATED[key]*100).toFixed(2)}%)`, rate: CALIBRATED[key], source: 'calibrated', group: 'us' }
    }
    const tf = TF_US_BASE[code] ?? 0
    if (tf === 0) {
      return { code: key, label: `${US_NAMES[code]} (no sales tax)`, rate: 0, source: 'estimate', group: 'us' }
    }
    return { code: key, label: `${US_NAMES[code]} (~${(tf*100).toFixed(2)}%)`, rate: tf, source: 'estimate', group: 'us' }
  }),
  // International — only the ones we've seen
  ...Object.keys(INTL_LABELS).sort().map<Region>(code => ({
    code, label: INTL_LABELS[code], rate: CALIBRATED[code] ?? 0, source: 'calibrated', group: 'intl',
  })),
  // Catch-all
  { code: 'OTHER', label: 'Other / not listed', rate: 0, source: 'none', group: 'none' },
]

export function findRegion(code: string | null | undefined): Region | null {
  if (!code) return null
  return REGIONS.find(r => r.code === code) ?? null
}

/**
 * Estimate sales tax on a given charge amount (USD).
 * Returns null if region is unknown — caller should show a "+ tax may apply" note.
 */
export function estimateRegionTax(code: string | null | undefined, taxableUsd: number): {
  rate: number
  tax: number
  source: Region['source']
  label: string
} | null {
  const r = findRegion(code)
  if (!r || r.source === 'none') return null
  const tax = Math.round(taxableUsd * r.rate * 100) / 100
  return { rate: r.rate, tax, source: r.source, label: r.label }
}
