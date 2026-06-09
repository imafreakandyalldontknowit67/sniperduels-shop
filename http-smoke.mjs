// HTTP smoke test for all routes
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE_URL || 'http://localhost:3010';
const OUT_DIR = './upgrade-snapshots/http-bodies';
fs.mkdirSync(OUT_DIR, { recursive: true });

// Page routes (categorized)
const pageRoutes = [
  // Public static
  { path: '/', expect: '2xx', kind: 'public' },
  { path: '/about', expect: '2xx', kind: 'public' },
  { path: '/faq', expect: '2xx', kind: 'public' },
  { path: '/privacy', expect: '2xx', kind: 'public' },
  { path: '/refunds', expect: '2xx', kind: 'public' },
  { path: '/terms', expect: '2xx', kind: 'public' },
  { path: '/marketplace', expect: '2xx', kind: 'public' },
  { path: '/gems', expect: '2xx', kind: 'public' },
  { path: '/login-success', expect: 'any', kind: 'public' },
  { path: '/dev/checkout-success', expect: 'any', kind: 'dev' },
  // Dynamic gems (whitelisted programmatic SEO slugs)
  { path: '/gems/100k', expect: '2xx', kind: 'dynamic' },
  { path: '/gems/500k', expect: '2xx', kind: 'dynamic' },
  { path: '/gems/1m', expect: '2xx', kind: 'dynamic' },
  { path: '/gems/cheap', expect: '2xx', kind: 'dynamic' },
  { path: '/gems/buy', expect: '2xx', kind: 'dynamic' },
  { path: '/gems/notarealslug123', expect: '4xx', kind: 'dynamic' },
  // Knives mystery
  { path: '/knives', expect: '4xx', kind: 'unknown' },
  // Auth-gated dashboard
  { path: '/dashboard', expect: 'any', kind: 'auth' },
  { path: '/dashboard/orders', expect: 'any', kind: 'auth' },
  { path: '/dashboard/orders/abc123', expect: 'any', kind: 'auth' },
  { path: '/dashboard/profile', expect: 'any', kind: 'auth' },
  { path: '/dashboard/deposit', expect: 'any', kind: 'auth' },
  { path: '/dashboard/vendor', expect: 'any', kind: 'auth' },
  { path: '/dashboard/vendor/deposit', expect: 'any', kind: 'auth' },
  { path: '/dashboard/vendor/earnings', expect: 'any', kind: 'auth' },
  { path: '/dashboard/vendor/payouts', expect: 'any', kind: 'auth' },
  { path: '/dashboard/vendor/withdraw', expect: 'any', kind: 'auth' },
  // Auth-gated admin
  { path: '/admin', expect: 'any', kind: 'admin' },
  { path: '/admin/analytics', expect: 'any', kind: 'admin' },
  { path: '/admin/analytics/dropoffs', expect: 'any', kind: 'admin' },
  { path: '/admin/analytics/funnels', expect: 'any', kind: 'admin' },
  { path: '/admin/finance', expect: 'any', kind: 'admin' },
  { path: '/admin/gems', expect: 'any', kind: 'admin' },
  { path: '/admin/orders', expect: 'any', kind: 'admin' },
  { path: '/admin/reconcile', expect: 'any', kind: 'admin' },
  { path: '/admin/referrals', expect: 'any', kind: 'admin' },
  { path: '/admin/settings', expect: 'any', kind: 'admin' },
  { path: '/admin/stock', expect: 'any', kind: 'admin' },
  { path: '/admin/users', expect: 'any', kind: 'admin' },
  { path: '/admin/vendors', expect: 'any', kind: 'admin' },
  { path: '/admin/withdraw', expect: 'any', kind: 'admin' },
];

// API GET routes (safe to probe)
const apiRoutes = [
  { path: '/api/auth/me', expect: 'any', kind: 'api' },
  { path: '/api/bot/status', expect: 'any', kind: 'api' },
  { path: '/api/crypto-currencies', expect: 'any', kind: 'api' },
  { path: '/api/exchange-rates', expect: 'any', kind: 'api' },
  { path: '/api/gems/listings', expect: 'any', kind: 'api' },
  { path: '/api/gems/stock', expect: 'any', kind: 'api' },
  { path: '/api/geo', expect: 'any', kind: 'api' },
  { path: '/api/settings', expect: 'any', kind: 'api' },
  { path: '/api/stats', expect: 'any', kind: 'api' },
  { path: '/api/stock', expect: 'any', kind: 'api' },
  // Special routes
  { path: '/r/test123', expect: 'any', kind: 'special' },
  { path: '/redirect', expect: 'any', kind: 'special' },
  { path: '/pb', expect: 'any', kind: 'special' },
  { path: '/api/canary/test', expect: 'any', kind: 'special' },
  // Auth-gated API expected 401
  { path: '/api/admin/users', expect: '401or403', kind: 'api-admin' },
  { path: '/api/admin/orders', expect: 'any', kind: 'api-admin' },
  { path: '/api/admin/settings', expect: 'any', kind: 'api-admin' },
  { path: '/api/admin/finance', expect: 'any', kind: 'api-admin' },
  { path: '/api/admin/stock', expect: 'any', kind: 'api-admin' },
  { path: '/api/admin/bot-status', expect: 'any', kind: 'api-admin' },
  { path: '/api/admin/gems', expect: 'any', kind: 'api-admin' },
  { path: '/api/admin/vendors', expect: 'any', kind: 'api-admin' },
  { path: '/api/admin/referrals', expect: 'any', kind: 'api-admin' },
  { path: '/api/admin/reconcile', expect: 'any', kind: 'api-admin' },
];

const allRoutes = [...pageRoutes, ...apiRoutes];

function slugify(p) {
  return p.replace(/^\//, '').replace(/[^a-z0-9]/gi, '_') || 'root';
}

const results = [];
let pass = 0, fail = 0;

for (const r of allRoutes) {
  const url = BASE + r.path;
  const start = Date.now();
  try {
    const res = await fetch(url, { redirect: 'manual' });
    const elapsed = Date.now() - start;
    const body = await res.text();
    const slug = slugify(r.path);
    fs.writeFileSync(path.join(OUT_DIR, slug + '.html'), body);
    const code = res.status;
    const isOk = code >= 200 && code < 500;
    const is5xx = code >= 500;
    if (is5xx) fail++; else pass++;
    const out = {
      path: r.path,
      kind: r.kind,
      code,
      elapsed_ms: elapsed,
      size: body.length,
      content_type: res.headers.get('content-type') || '',
      location: res.headers.get('location') || null,
      has_error_text: /Application error|Internal Server Error|TypeError|ReferenceError|This page could not be found/.test(body),
      is5xx,
      body_snippet: is5xx ? body.slice(0, 800) : null,
    };
    results.push(out);
    console.log(`${code} ${r.path} (${elapsed}ms, ${body.length}b)${out.has_error_text ? ' ERR-TEXT' : ''}`);
  } catch (e) {
    fail++;
    results.push({ path: r.path, kind: r.kind, error: String(e) });
    console.log(`FAIL ${r.path}: ${e.message}`);
  }
}

fs.writeFileSync('./upgrade-snapshots/http-smoke-results.json', JSON.stringify(results, null, 2));
console.log(`\nDone. pass=${pass} fail(5xx)=${fail} total=${results.length}`);
const byCode = {};
for (const r of results) {
  const k = r.code ? String(r.code)[0] + 'xx' : 'err';
  byCode[k] = (byCode[k] || 0) + 1;
}
console.log('Breakdown:', byCode);
