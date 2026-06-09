#!/usr/bin/env node
// Cross-browser site walker. One process = one combo. Outputs JSON to stdout.
//
// Env vars:
//   ENGINE     chromium | firefox | webkit
//   DEVICE     desktop-1920 | desktop-1366 | iphone-15 | iphone-se | pixel-7 | ipad-pro | galaxy-s9
//   UBLOCK_SIM 0 | 1 (route-block known tracker/analytics URLs to mimic uBlock)
//   COMBO_ID   tag added to each result row for cross-batch correlation
//
// Pages walked: /, /gems, /gems/100k, /shop, /faq, /terms, /privacy, /refunds, /about
//
// Per page checks:
//   - HTTP status (must be 200)
//   - Title contains expected substring
//   - DOM body text does NOT contain "SOMETHING WENT WRONG" / "GLOBAL ERROR"
//   - Console errors collected (with allowlist for known-noise like CF beacon CSP)
//   - Page-specific key-element check (e.g. /gems must have the gem-amount stepper)
//
// Exit code: 0 if all pages pass, 1 otherwise.

import playwright from 'playwright'

const ENGINE     = process.env.ENGINE     || 'chromium'
const DEVICE     = process.env.DEVICE     || 'desktop-1920'
const UBLOCK_SIM = process.env.UBLOCK_SIM === '1'
const COMBO_ID   = process.env.COMBO_ID   || `${ENGINE}-${DEVICE}-${UBLOCK_SIM ? 'ublock' : 'clean'}`
const BASE       = process.env.BASE_URL   || 'https://sniperduels.shop'

const DEVICE_PROFILES = {
  'desktop-1920': { viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, isMobile: false },
  'desktop-1366': { viewport: { width: 1366, height: 768 },  deviceScaleFactor: 1, isMobile: false },
  'iphone-15':    playwright.devices['iPhone 15'],
  'iphone-se':    playwright.devices['iPhone SE'],
  'pixel-7':      playwright.devices['Pixel 7'],
  'ipad-pro':     playwright.devices['iPad Pro 11'],
  'galaxy-s9':    playwright.devices['Galaxy S9+'],
}

const PAGES = [
  { path: '/',          titleContains: 'Sniper Duels Auto Shop',  keySelector: 'a[href="/gems"]' },
  { path: '/gems',      titleContains: 'Buy Sniper Duels Gems',   keySelector: 'input[type="text"], input[type="number"]' },
  { path: '/gems/100k', titleContains: '100k',                    keySelector: 'a[href*="gems?amount=100"]' },
  { path: '/shop',      titleContains: 'Items',                   keySelector: 'main' },
  { path: '/faq',       titleContains: 'FAQ',                     keySelector: 'main' },
  { path: '/terms',     titleContains: 'Terms',                   keySelector: 'main' },
  { path: '/privacy',   titleContains: 'Privacy',                 keySelector: 'main' },
  { path: '/refunds',   titleContains: 'Refund',                  keySelector: 'main' },
  { path: '/about',     titleContains: 'About',                   keySelector: 'main' },
]

// Console-error noise allowlist. CF beacon CSP block is the only known
// pre-existing console error site-wide; not a regression of our fix.
const CONSOLE_NOISE = [
  /static\.cloudflareinsights\.com\/beacon/i,
  /Failed to load resource.*cloudflareinsights/i,
]

// uBlock-sim URL patterns. Block requests to these hosts to mimic content
// blockers that were specifically what broke the user's /gems page.
const UBLOCK_PATTERNS = [
  /us\.i\.posthog\.com\/static\/recorder/i,
  /us-assets\.i\.posthog\.com\/static\/recorder/i,
  /ph\.sniperduels\.shop\/static\/recorder/i,
  /\/posthog-recorder\.js/i,
  /\/recorder\.js\?/i,
  /\/surveys\.js\?/i,
  /\/array\.js\?.*recorder/i,
  /cloudflareinsights\.com/i,
  /google-analytics\.com/i,
  /googletagmanager\.com/i,
]

function isConsoleNoise(text) {
  return CONSOLE_NOISE.some(re => re.test(text))
}

function isBlockedByUBlock(url) {
  return UBLOCK_PATTERNS.some(re => re.test(url))
}

async function walk() {
  const profile = DEVICE_PROFILES[DEVICE]
  if (!profile) throw new Error(`unknown DEVICE: ${DEVICE}`)

  const browser = await playwright[ENGINE].launch({ headless: true })
  const context = await browser.newContext({
    ...profile,
    locale: 'en-US',
    timezoneId: 'America/Los_Angeles',
  })

  if (UBLOCK_SIM) {
    await context.route('**', route => {
      if (isBlockedByUBlock(route.request().url())) {
        return route.abort('blockedbyclient')
      }
      return route.continue()
    })
  }

  const results = []
  const page = await context.newPage()

  for (const spec of PAGES) {
    const consoleErrors = []
    const pageErrors = []
    page.removeAllListeners('console')
    page.removeAllListeners('pageerror')
    page.on('console', msg => {
      if (msg.type() === 'error' && !isConsoleNoise(msg.text())) {
        consoleErrors.push(msg.text().slice(0, 300))
      }
    })
    page.on('pageerror', err => {
      pageErrors.push(`${err.name}: ${err.message}`.slice(0, 300))
    })

    const url = BASE + spec.path
    let status = null
    let title = null
    let elementFound = false
    let errorBoundaryShown = false
    let errorBoundaryFriendly = false
    let bodyText = ''
    let navError = null

    try {
      const resp = await page.goto(url, { timeout: 30_000, waitUntil: 'domcontentloaded' })
      status = resp ? resp.status() : null
      // Allow client hydration / posthog init / data fetches to settle.
      try { await page.waitForLoadState('networkidle', { timeout: 8_000 }) } catch { /* ok */ }
      title = await page.title()
      try {
        elementFound = (await page.locator(spec.keySelector).count()) > 0
      } catch { elementFound = false }
      bodyText = (await page.evaluate(() => document.body?.innerText || '')).toUpperCase()
      // Old global-error.tsx fingerprint
      errorBoundaryShown = bodyText.includes('SOMETHING WENT WRONG') || bodyText.includes('AN UNEXPECTED ERROR OCCURRED')
      // New app/gems/error.tsx fingerprint — fine to show as long as it's
      // OUR friendly UI, but flag it so a human eyeballs.
      errorBoundaryFriendly = bodyText.includes("COULDN'T LOAD THE GEM SHOP")
    } catch (e) {
      navError = String(e?.message || e).slice(0, 300)
    }

    // Per-page verdict.
    const ok =
      status === 200 &&
      title && title.includes(spec.titleContains) &&
      elementFound &&
      !errorBoundaryShown &&
      !errorBoundaryFriendly &&
      pageErrors.length === 0 &&
      !navError

    results.push({
      combo: COMBO_ID,
      path: spec.path,
      status,
      title: title?.slice(0, 120) || null,
      titleContainsExpected: title ? title.includes(spec.titleContains) : false,
      keySelector: spec.keySelector,
      keyElementFound: elementFound,
      errorBoundaryShown,
      errorBoundaryFriendly,
      consoleErrors: consoleErrors.slice(0, 5),
      pageErrors: pageErrors.slice(0, 5),
      navError,
      ok,
    })
  }

  await context.close()
  await browser.close()

  const allOk = results.every(r => r.ok)
  const summary = {
    combo: COMBO_ID,
    engine: ENGINE,
    device: DEVICE,
    ublockSim: UBLOCK_SIM,
    pageCount: results.length,
    passed: results.filter(r => r.ok).length,
    failed: results.filter(r => !r.ok).length,
    allOk,
    pages: results,
  }

  // One JSON line for easy ingest.
  console.log(JSON.stringify(summary))
  process.exit(allOk ? 0 : 1)
}

walk().catch(err => {
  console.log(JSON.stringify({
    combo: COMBO_ID,
    engine: ENGINE,
    device: DEVICE,
    ublockSim: UBLOCK_SIM,
    fatal: String(err?.stack || err).slice(0, 1000),
    allOk: false,
  }))
  process.exit(2)
})
