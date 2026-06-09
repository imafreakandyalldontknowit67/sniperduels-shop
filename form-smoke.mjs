// Form interactivity smoke - hydration test
import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = 'http://localhost:3010';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });

const results = [];

async function testForm(routePath, label, fillFn) {
  const page = await ctx.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', (err) => pageErrors.push(err.message));

  try {
    await page.goto(BASE + routePath, { waitUntil: 'networkidle', timeout: 20000 });
    const interactive = await fillFn(page);
    await page.screenshot({
      path: `./upgrade-snapshots/upgraded/form-${label}.png`,
      fullPage: false,
    });
    results.push({
      route: routePath,
      label,
      interactive,
      console_errors: consoleErrors.length,
      page_errors: pageErrors.length,
      page_error_msgs: pageErrors,
    });
    console.log(`FORM ${routePath} ${label}: interactive=${interactive} consoleErr=${consoleErrors.length} pageErr=${pageErrors.length}`);
  } catch (e) {
    results.push({ route: routePath, label, error: e.message });
    console.log(`FORM ${routePath} ${label}: FAIL ${e.message}`);
  }
  await page.close();
}

// /gems amount input
await testForm('/gems', 'gems-amount-input', async (page) => {
  // Find a numeric input (gem amount)
  const inputs = await page.$$('input');
  if (!inputs.length) return false;
  let filled = false;
  for (const input of inputs) {
    const type = await input.getAttribute('type');
    const inputmode = await input.getAttribute('inputmode');
    if (type === 'number' || inputmode === 'numeric' || type === 'text') {
      await input.fill('250').catch(() => {});
      const v = await input.inputValue().catch(() => '');
      if (v === '250') { filled = true; break; }
    }
  }
  return filled;
});

// /shop search/filter (if any)
await testForm('/shop', 'shop-search', async (page) => {
  // Probe for any input or interactive element
  const inputs = await page.$$('input');
  if (inputs.length === 0) return 'no-inputs-on-shop';
  let interacted = false;
  for (const input of inputs.slice(0, 3)) {
    try {
      await input.fill('test');
      const v = await input.inputValue();
      if (v === 'test') { interacted = true; break; }
    } catch {}
  }
  return interacted;
});

// /gems/buy (programmatic SEO landing)
await testForm('/gems/buy', 'gems-buy-link-click', async (page) => {
  // Should have CTA links to /gems
  const links = await page.$$('a[href^="/gems"]');
  await page.hover('a[href^="/gems"]').catch(() => {});
  return links.length > 0;
});

await browser.close();
fs.writeFileSync('./upgrade-snapshots/form-smoke-results.json', JSON.stringify(results, null, 2));
console.log('\n=== FORM SMOKE SUMMARY ===');
console.log(JSON.stringify(results, null, 2));
