// Extreme browser smoke test using Playwright
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE_URL || 'http://localhost:3010';
const SHOTS_DIR = './upgrade-snapshots/upgraded';
fs.mkdirSync(SHOTS_DIR, { recursive: true });

// Page routes only (skip API)
const routes = [
  { path: '/', slug: 'home' },
  { path: '/marketplace', slug: 'marketplace' },
  { path: '/gems', slug: 'gems' },
  { path: '/about', slug: 'about' },
  { path: '/faq', slug: 'faq' },
  { path: '/privacy', slug: 'privacy' },
  { path: '/terms', slug: 'terms' },
  { path: '/refunds', slug: 'refunds' },
  { path: '/login-success', slug: 'login-success' },
  { path: '/gems/100k', slug: 'gems-100k' },
  { path: '/gems/500k', slug: 'gems-500k' },
  { path: '/gems/1m', slug: 'gems-1m' },
  { path: '/gems/cheap', slug: 'gems-cheap' },
  { path: '/gems/buy', slug: 'gems-buy' },
  { path: '/dashboard', slug: 'dashboard' },
  { path: '/dashboard/orders', slug: 'dashboard-orders' },
  { path: '/dashboard/profile', slug: 'dashboard-profile' },
  { path: '/dashboard/deposit', slug: 'dashboard-deposit' },
  { path: '/dashboard/vendor', slug: 'dashboard-vendor' },
  { path: '/admin', slug: 'admin' },
  { path: '/admin/orders', slug: 'admin-orders' },
  { path: '/admin/users', slug: 'admin-users' },
  { path: '/admin/finance', slug: 'admin-finance' },
  { path: '/admin/settings', slug: 'admin-settings' },
  { path: '/admin/analytics', slug: 'admin-analytics' },
  { path: '/admin/analytics/dropoffs', slug: 'admin-analytics-dropoffs' },
  { path: '/admin/analytics/funnels', slug: 'admin-analytics-funnels' },
];

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  ignoreHTTPSErrors: true,
});

const ERR_TEXT = /Application error|Internal Server Error|TypeError:|ReferenceError:|Cannot read prop/;
const HYDRATION_PATTERNS = /[Hh]ydration|did not match|hydrat/;

const results = [];

for (const r of routes) {
  const page = await ctx.newPage();
  const consoleMsgs = [];
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  const hydrationWarnings = [];

  page.on('console', (msg) => {
    const text = msg.text();
    consoleMsgs.push({ type: msg.type(), text });
    if (msg.type() === 'error') consoleErrors.push(text);
    if (HYDRATION_PATTERNS.test(text)) hydrationWarnings.push(text);
  });
  page.on('pageerror', (err) => {
    pageErrors.push({ message: err.message, stack: err.stack });
  });
  page.on('requestfailed', (req) => {
    const fail = req.failure();
    failedRequests.push({
      url: req.url(),
      method: req.method(),
      reason: fail ? fail.errorText : 'unknown',
    });
  });

  const url = BASE + r.path;
  const t0 = Date.now();
  let status = null;
  let finalUrl = null;
  let title = null;
  let h1s = [];
  let h2s = [];
  let bodyText = '';
  let errored = null;
  let hasErrorText = false;

  try {
    const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 25000 });
    status = resp ? resp.status() : null;
    finalUrl = page.url();
    title = await page.title().catch(() => null);
    h1s = await page.$$eval('h1', els => els.map(e => e.textContent?.trim()).filter(Boolean)).catch(() => []);
    h2s = await page.$$eval('h2', els => els.map(e => e.textContent?.trim()).filter(Boolean).slice(0, 10)).catch(() => []);
    bodyText = await page.evaluate(() => document.body?.innerText || '').catch(() => '');
    hasErrorText = ERR_TEXT.test(bodyText);

    // Screenshot (skip for redirects to login)
    try {
      await page.screenshot({
        path: path.join(SHOTS_DIR, r.slug + '.png'),
        fullPage: true,
        timeout: 10000,
      });
    } catch (e) {
      errored = `screenshot: ${e.message}`;
    }
  } catch (e) {
    errored = e.message;
  }

  const elapsed = Date.now() - t0;
  results.push({
    path: r.path,
    slug: r.slug,
    status,
    final_url: finalUrl,
    redirected: finalUrl && finalUrl !== url,
    title,
    h1: h1s,
    h2: h2s,
    body_chars: bodyText.length,
    has_error_text: hasErrorText,
    console_error_count: consoleErrors.length,
    console_errors: consoleErrors.slice(0, 5),
    page_error_count: pageErrors.length,
    page_errors: pageErrors,
    failed_request_count: failedRequests.length,
    failed_requests: failedRequests.slice(0, 10),
    hydration_warnings: hydrationWarnings,
    elapsed_ms: elapsed,
    error: errored,
  });

  const flags = [];
  if (pageErrors.length) flags.push(`PG-ERR:${pageErrors.length}`);
  if (consoleErrors.length) flags.push(`CON-ERR:${consoleErrors.length}`);
  if (hydrationWarnings.length) flags.push(`HYD:${hydrationWarnings.length}`);
  if (failedRequests.length) flags.push(`NET-FAIL:${failedRequests.length}`);
  if (hasErrorText) flags.push('ERR-TEXT');
  if (errored) flags.push(`ERR:${errored.slice(0, 40)}`);
  console.log(`${status || '???'} ${r.path} -> ${finalUrl || ''} (${elapsed}ms) ${flags.join(' ') || 'OK'}`);

  await page.close();
}

await browser.close();

fs.writeFileSync('./extreme-smoke-results.json', JSON.stringify(results, null, 2));

const critical = results.filter(r => r.page_error_count > 0 || r.hydration_warnings.length > 0 || r.has_error_text);
const totalConsoleErrors = results.reduce((s, r) => s + r.console_error_count, 0);
const totalPageErrors = results.reduce((s, r) => s + r.page_error_count, 0);
const totalHydration = results.reduce((s, r) => s + r.hydration_warnings.length, 0);
const totalFailedReq = results.reduce((s, r) => s + r.failed_request_count, 0);

console.log('\n=== SUMMARY ===');
console.log(`Pages tested: ${results.length}`);
console.log(`Console errors total: ${totalConsoleErrors}`);
console.log(`Page errors total: ${totalPageErrors}`);
console.log(`Hydration warnings total: ${totalHydration}`);
console.log(`Failed network requests total: ${totalFailedReq}`);
console.log(`Critical pages (page-err / hydration / err-text): ${critical.length}`);
critical.forEach(c => {
  console.log(`  - ${c.path}: pgErr=${c.page_error_count} hyd=${c.hydration_warnings.length} errText=${c.has_error_text}`);
});
