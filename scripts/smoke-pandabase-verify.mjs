// Smoke test for the Pandabase webhook verifier.
// Generates synthetic V2 + legacy signatures and confirms the verifier
// accepts valid ones, rejects tampered ones, rejects stale timestamps.
//
// Run:  npx tsx scripts/smoke-pandabase-verify.mjs

import crypto from 'node:crypto';

const { verifyWebhookSignature } = await import('../lib/pandabase.ts');

const SECRET = 'whsec_test_dGVzdF9zZWNyZXRfZm9yX3Ntb2tlX3Rlc3Q';
process.env.PANDABASE_WEBHOOK_SECRET = SECRET;

let pass = 0;
let fail = 0;
function check(name, actual, expected) {
  if (actual === expected) {
    console.log(`  PASS  ${name}`);
    pass++;
  } else {
    console.log(`  FAIL  ${name}  (got=${actual} want=${expected})`);
    fail++;
  }
}

function makeHeaders(record) {
  return {
    get(name) {
      const v = record[name.toLowerCase()];
      return v == null ? null : String(v);
    },
  };
}

const body = JSON.stringify({ event: 'PAYMENT_COMPLETED', id: 'evt_smoke_001', amount: 100 });

// --- V2 valid ---
{
  const id = 'evt_smoke_001';
  const ts = Math.floor(Date.now() / 1000).toString();
  const sig = crypto.createHmac('sha256', SECRET).update(`${id}.${ts}.${body}`).digest('base64');
  check('V2 valid (single sig)', verifyWebhookSignature(body, makeHeaders({
    'webhook-id': id,
    'webhook-timestamp': ts,
    'webhook-signature': `v1,${sig}`,
  })), true);

  // Multi-sig list, second entry valid
  check('V2 valid (multi-sig list, 2nd matches)', verifyWebhookSignature(body, makeHeaders({
    'webhook-id': id,
    'webhook-timestamp': ts,
    'webhook-signature': `v1,AAAA${sig.slice(4)} v1,${sig}`,
  })), true);
}

// --- V2 tampered body ---
{
  const id = 'evt_smoke_002';
  const ts = Math.floor(Date.now() / 1000).toString();
  const sig = crypto.createHmac('sha256', SECRET).update(`${id}.${ts}.${body}`).digest('base64');
  check('V2 rejects tampered body', verifyWebhookSignature(body + 'x', makeHeaders({
    'webhook-id': id,
    'webhook-timestamp': ts,
    'webhook-signature': `v1,${sig}`,
  })), false);
}

// --- V2 stale timestamp (10 min ago) ---
{
  const id = 'evt_smoke_003';
  const ts = (Math.floor(Date.now() / 1000) - 600).toString();
  const sig = crypto.createHmac('sha256', SECRET).update(`${id}.${ts}.${body}`).digest('base64');
  check('V2 rejects stale timestamp (>5min)', verifyWebhookSignature(body, makeHeaders({
    'webhook-id': id,
    'webhook-timestamp': ts,
    'webhook-signature': `v1,${sig}`,
  })), false);
}

// --- V2 wrong secret ---
{
  const id = 'evt_smoke_004';
  const ts = Math.floor(Date.now() / 1000).toString();
  const sig = crypto.createHmac('sha256', 'wrong_secret').update(`${id}.${ts}.${body}`).digest('base64');
  check('V2 rejects wrong-secret sig', verifyWebhookSignature(body, makeHeaders({
    'webhook-id': id,
    'webhook-timestamp': ts,
    'webhook-signature': `v1,${sig}`,
  })), false);
}

// --- Legacy valid ---
{
  const sig = crypto.createHmac('sha256', SECRET).update(body).digest('hex');
  check('Legacy valid', verifyWebhookSignature(body, makeHeaders({
    'x-pandabase-signature': sig,
  })), true);
}

// --- Legacy tampered ---
{
  const sig = crypto.createHmac('sha256', SECRET).update(body).digest('hex');
  check('Legacy rejects tampered body', verifyWebhookSignature(body + 'x', makeHeaders({
    'x-pandabase-signature': sig,
  })), false);
}

// --- No headers at all ---
check('Rejects with no headers', verifyWebhookSignature(body, makeHeaders({})), false);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
