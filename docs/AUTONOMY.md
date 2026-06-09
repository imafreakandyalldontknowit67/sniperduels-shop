# Autonomous Iteration Plan

A multi-phase, checklist-driven plan for the Sniper Duels item marketplace
that can be picked up by an agent (`/loop`, background runner, or human) and
worked one task at a time without losing context.

**How to use this document**

- Each phase lists concrete tasks with `[ ]` checkboxes.
- Tick a box (`[x]`) when the task lands in a commit.
- Phases are mostly independent — pick the highest-priority unticked task you
  can land safely. Dependencies are called out at the top of each phase.
- "Hardening" tasks tighten existing code; "Sketch" tasks describe code that
  hasn't been written yet and propose a flow + schema.
- When a sketch task is implemented, replace the **Sketch** block with a
  **Built** block linking to the actual files.

**Stop conditions for autonomous loops**

Stop iterating when ANY of:
1. All boxes in the current phase are ticked.
2. The next task is `Blocked` (see status of bot account level 8, Pandabase migration, etc.).
3. The next task changes prod-shared state (DB migration, webhook URL change) — escalate to a human.
4. Type-check or test suite fails after a change and the root cause isn't a one-line fix.

---

## Phase status (high-level)

| Phase | Title | Status |
|---|---|---|
| 0 | Item-bot OCR pipeline | ✅ Done (97.8% accuracy) |
| 1 | Site constants + catalog seed | ✅ Done |
| 2 | Catalog DB + auto-indexing + bidirectional sync | ✅ Done |
| 3 | Vault, listings, delivery jobs (backend) | ✅ Done |
| **4** | **Order → DeliveryJob webhook integration** | **🔨 Sketch** |
| 5 | Marketplace browse + buy UI | 🔨 Sketch |
| 6 | Bot-side Python daemon (job worker loop) | 🔨 Sketch |
| 7 | Trade-window OCR calibration | ⏭ Blocked on level 8 |
| 8 | Top-trader discovery sweep | 🔨 Sketch |
| 9 | Hardening pass (existing code) | ⏳ Continuous |
| 10 | Observability + alerting | 🔨 Sketch |
| 11 | Security audit | 🔨 Sketch |
| 12 | Production rollout (feature-flagged) | ⏭ After 4–11 |

---

## Phase 4 — Order → DeliveryJob webhook integration

**Goal**: when a buyer pays for an item listing, a `ItemDeliveryJob` row
is created and the bot picks it up automatically.

**Depends on**: Phase 3 (DB tables exist).

**Risk**: medium — touches Pandabase webhook code path (live revenue).

### Tasks

- [x] **4.1** Add `vaultListingId: String?` to `Order` model. Set when an
      item-type order is created. (Migration: nullable, no backfill.) — _migration `20260531020000_order_vault_listing_id`_
- [x] **4.2** Update `app/api/marketplace/items` listing detail endpoint
      (`GET /api/marketplace/items/[id]`) to expose listing → vault → catalog
      → owner shape for the buy modal. — _`app/api/marketplace/items/[id]/route.ts`_
- [x] **4.3** New endpoint `POST /api/marketplace/items/[id]/buy` —
      authenticated, debited from wallet OR redirects to Pandabase checkout
      for the listing price. Atomic: creates pending `Order` with
      `type='item'` and `vaultListingId` set; flips
      `VaultItem.status = reserved`; creates `ItemDeliveryJob` (status=queued).
      — _`app/api/marketplace/items/[id]/buy/route.ts` + jobs/next gates on
      Order.status='processing|completed'_
- [x] **4.4** Pandabase webhook handler (`app/api/webhooks/pandabase/route.ts`)
      branches on `Order.type`. For `type='item'`:
        - On `paid`: confirm the `ItemDeliveryJob` (already exists from buy
          intent), settle seller-side ledger at delivery completion time
          (not here).
        - On `failed` / `cancelled`: flip vault back to `listed`, mark Order
          failed. — _idempotent item-order branch added; gem flow untouched_
- [x] **4.5** Wallet-balance buy path (no Pandabase round-trip): same as
      4.3 but immediately marks `Order.status='processing'` and seeds the
      `ItemDeliveryJob`. — _handled via `method='wallet'` in 4.3 + helper_
- [x] **4.6** Add `lib/marketplace.ts` with helpers:
        - `purchaseListing(listingId, buyerId, paymentMethod)` — wraps 4.3
        - `refundListingPurchase(orderId, reason)` — for failed deliveries
        — _`lib/marketplace.ts` (MarketplaceError class included)_
- [x] **4.7** Cron at `/api/cron/expire-stale-deliveries` (existing cron
      pattern) — `ItemDeliveryJob` stuck in `bot_in_trade` for >30 min →
      flip back to `queued`. Bot is unreachable.
      — _also handles withdrawals + deposit sessions; auth via `x-cron-secret`_

**Acceptance**: in a test deploy, buying an item via wallet (4.5) creates an
`ItemDeliveryJob` visible to `GET /api/bot/v1/jobs/next` and locks the
VaultItem. Refunding restores it.

---

## Phase 5 — Marketplace browse + buy UI

**Goal**: public listings page where buyers see items + click Buy.

**Depends on**: Phase 4 (purchase endpoint).

**Risk**: low — additive UI pages, no schema changes.

### Tasks

- [x] **5.1** `/marketplace` listings grid. Filters: type (sniper/knife),
      weapon, rarity, max price. Sorts: price asc/desc, recent.
      — _`app/marketplace/page.tsx`_
- [x] **5.2** `/marketplace/[id]` listing detail. Shows full fingerprint
      (rarity, condition, kills, fx, fragtrakr), seller display name,
      "Buy now" button. Pulls from `GET /api/marketplace/items/[id]`.
      — _`app/marketplace/[id]/page.tsx`_
- [x] **5.3** Buy modal: shows wallet balance, "Pay with wallet" vs "Pay
      with crypto/card" (Pandabase). Disabled with reason banner if listing
      reserved/sold mid-render. — _inline in listing detail page_
- [x] **5.4** Buyer order tracking page `/orders/items/[orderId]` — shows
      delivery job status (queued → bot_in_trade → completed). Server-side
      poll every 5s, live-update. — _page + `/api/marketplace/orders/[orderId]`_
- [x] **5.5** Buyer-side instructions banner: "Join private server
      [link]. Bot will trade you within 2 min." (Replicates existing
      gem-delivery flow UX.) — _included in tracking page bot_in_trade step_
- [ ] **5.6** Update `lib/constants.ts` `SHOP_CATEGORIES` "items" entry to
      point at `/marketplace` instead of `/shop` once Phase 5 GA. _(holding until Phase 12)_

**Acceptance**: a buyer can browse listings, click Buy, complete payment,
and see the delivery progress page. Visual diff vs `/gems` for UX
consistency.

---

## Phase 6 — Bot-side Python daemon (job worker loop)

**Goal**: a long-running Python process that polls
`/api/bot/v1/jobs/next` every ~5s and dispatches to the right handler.

**Depends on**: Phase 3 endpoints (done) + bot account at level 8 for real
trade window flow.

**Risk**: high — drives real Roblox trades against real users.

### Sketch

```
sniperduels-item-bot/bot/daemon.py        — main poll loop
sniperduels-item-bot/bot/workflows/
  deposit.py        — run_deposit(session_id, roblox_name, mode, declaredItems)
  delivery.py       — run_delivery(deliveryId, vault, buyerRobloxName, expected)
  withdrawal.py     — run_withdrawal(withdrawalId, vaultItemId, userRobloxName)
sniperduels-item-bot/bot/site_api.py      — HTTP client (already partially exists)
sniperduels-item-bot/bot/safe_input.py    — wraps adb taps with sanity checks
```

### Tasks

- [x] **6.1** `bot/site_api.py` — wraps `GET /api/bot/v1/jobs/next` +
      `POST` complete/failed/cancel endpoints. Auth header from
      `BOT_API_KEY` env. Retry with backoff on 5xx.
      — _no-op unless `BOT_DAEMON_ENABLED=1`; SiteAPIError on 4xx, return None on transient_
- [x] **6.2** `bot/daemon.py` main loop: poll → switch on `kind` → call
      workflow → report status. Crash-safe (catches all, logs, continues).
      Heartbeat every 30s via existing `/api/bot/heartbeat` mechanism.
      — _consecutive-fail backoff + adb.assert_screen_locked on startup_
- [⏭] **6.3** `bot/workflows/deposit.py` — _scaffold landed; trade-window steps blocked on Phase 7 (level 8)_
- [⏭] **6.4** `bot/workflows/delivery.py` — _scaffold lands `find_target_item` step; trade-window steps blocked on Phase 7_
- [⏭] **6.5** `bot/workflows/withdrawal.py` — _same scaffold; trade-window blocked_
- [ ] **6.6** `bot/safe_input.py` — adds these guards to every tap:
        - `assert_screen_locked()` before any input
        - Screencap before + after each step, hash-diff to confirm something
          changed (catches "tap registered but UI didn't respond" bugs)
        - Max 3 retries per step before bailing out the entire workflow
- [x] **6.7** `bot/workflows/__init__.py` registers handlers in a dispatch
      table so `daemon.py` can call `WORKFLOWS[kind](job)`.

**Acceptance**: in sandbox (with two test accounts), bot completes one
delivery end-to-end. Site marks order completed, seller wallet credits.

**Blocked on**: bot account `hfeshifes` reaching level 8 (Roblox trade
gating). Until then: build the workflows, dry-run against fixtures.

---

## Phase 7 — Trade-window OCR calibration

**Goal**: same parse-tooltip pipeline reused on the trade window's per-slot
tooltips.

**Depends on**: bot account at level 8.

### Tasks

- [ ] **7.1** Manually open a trade window (once available); capture
      reference screenshots into `recon/trade_window/`.
- [ ] **7.2** Adapt `find_inventory_cells` for the trade-window's slot
      grid (3×3? 4×4? layout TBD).
- [ ] **7.3** Verify `parse_tooltip.parse()` works on hover-screencaps of
      trade-window slots. Re-calibrate hue/value thresholds if the slot
      background differs from VIEW ITEMS panel.
- [ ] **7.4** Document any differences vs VIEW ITEMS in
      `recon/CAVEATS.md`.

**Acceptance**: hovering a slot in the trade window yields a clean
`Tooltip` fingerprint matching what's actually in the slot.

---

## Phase 8 — Top-trader discovery sweep

**Goal**: proactively populate `CatalogCandidate` by sweeping top players'
inventories on a schedule, so new items are detected even if no one's
deposited them yet.

**Depends on**: bot daemon (Phase 6).

### Sketch

Daemon idle behavior:
- Every 6 h when no job is queued, the bot:
  1. Opens TRADE panel.
  2. Identifies the top 10 players by win-streak (already visible in panel).
  3. For each, opens VIEW ITEMS, hover-sweeps all cells (scrolls multi-page).
  4. Reports any not-in-catalog fingerprints via existing
     `POST /api/bot/v1/catalog-candidate` (Phase 2).
- Logs each sweep so we don't redo the same player within 24 h.

### Tasks

- [ ] **8.1** `bot/workflows/sweep_idle.py` — runs when `GET /jobs/next`
      returns `null`.
- [ ] **8.2** `BotState` table key `last_sweep_at:{username}` to dedupe.
- [ ] **8.3** Throttle: max 3 sweeps per hour to avoid AFK-detection flags.

**Acceptance**: after 24 h running, `CatalogCandidate` shows >50 distinct
new-item reports (or the table is empty because the catalog is genuinely
complete).

---

## Phase 9 — Hardening pass (continuous)

These are bug-class tasks that apply to existing code. Tick as you find +
fix one.

### OCR pipeline

- [ ] **9.1** Add a "consensus across rotations" pass — capture the same
      tooltip with cursor at ±5 px to average out random OCR jitter on the
      EXIST digit reading.
- [ ] **9.2** When 2 PSMs agree on a digit string but a 3rd disagrees by
      a single character, prefer the agreement instead of longest.
- [ ] **9.3** Add `tradable` check back in for trade-window OCR (Phase 7) —
      Roblox may show items it CAN'T trade in the window if a user dragged
      an Untradable in via a glitch. Defense in depth.
- [⏭] **9.4** Cache compiled regexes at module level (currently re-compiled
      per call in parse_tooltip). — _Python's `re` module already caches compiled patterns (LRU ~512); negligible perf gain to pre-compile. Skipping unless profiling shows it as hot._
- [ ] **9.5** `find_target_item` should hash known-good screencaps so a
      second call within 10s on the same cell returns cached parse result.
- [ ] **9.6** Document the SECRET-bar look in `recon/CAVEATS.md` once an
      actual SECRET item appears in a sweep (still verifying via
      `is_dark_bar`).

### Site / API

- [x] **9.7** All bot endpoints — rate-limit per-source (max 30 req/min
      via Upstash Redis or in-memory token bucket). Bot api key isn't enough
      defense if leaked. — _`lib/rate-limit.ts` in-memory token bucket; applied to `/api/bot/v1/jobs/next` (30/min). **VERIFY**: multi-replica deploys need Redis backing — current Map is per-process._
- [x] **9.8** `POST /api/vault/[id]/list` — validate that `vault.status` is
      `'deposited'` OR `'listed'` (already done) AND that no
      `ItemDeliveryJob` exists for it. Edge case: re-list during a stuck
      delivery. — _refuses if delivery in {queued, bot_in_trade}_
- [ ] **9.9** `POST /api/vault/[id]/withdraw` race: if two clicks land
      simultaneously, only one creates the job. Add `@@unique` on
      `(vaultItemId, status='queued')` via composite filter at app layer.
- [x] **9.10** `ItemDeliveryJob.expectedFingerprint` is `Json` — strict-type
      it with a Zod schema in `lib/marketplace.ts` so a malformed write at
      job-creation time crashes early. — _`isValidFingerprint`/`assertValidFingerprint` (no Zod dep); enforced in deposit-complete route. **VERIFY**: extend coverage to `purchaseListing` (currently relies on vault.fingerprint being valid from deposit time)._
- [ ] **9.11** Listing price changes that lower below buyer-active intent:
      no good answer, but log it for audit.
- [x] **9.12** Idempotency keys on Pandabase webhook (Phase 4) — duplicate
      delivery rapid-fire from Pandabase retries would double-credit. Use
      `Order.id` as the key. — _already idempotent by design: `updateMany({where: {id, status: 'pending'}})` only flips once; `refundListingPurchase` short-circuits on `status in {refunded, failed}`. **VERIFY**: write an actual duplicate-payload smoke test._
- [x] **9.13** Backfill: write a one-off `scripts/audit-vault-consistency.ts`
      that flags VaultItems whose status doesn't match the latest
      listing/delivery/withdrawal state. Run weekly.
      — _detects 5 issue kinds; `--fix` auto-unlocks reserved-no-delivery; exits 1 on issues for cron alerting. **VERIFY**: caught 1 real orphan from earlier smoke run — clean up manually before deploy._

### Bot daemon

- [ ] **9.14** Heartbeat from daemon, separate from gem-bot's heartbeat,
      via a new `BOT_KIND` header. The existing offline banner only knows
      about the gem bot.
- [ ] **9.15** Crash-loop detection: if 3+ consecutive jobs fail, daemon
      sleeps 5 min before next poll instead of hammering.
- [ ] **9.16** Always re-screencap immediately before submitting a complete
      callback so we can attach the screenshot to the audit log.

---

## Phase 10 — Observability + alerting

**Goal**: when something breaks, someone (or something) notices fast.

### Sketch

- Discord channel `#item-marketplace-ops` gets a webhook ping for:
  - Bot daemon offline >5 min during active hours (08:00–24:00 PST)
  - `ItemDeliveryJob` failed with `attempts >= 3` (manual refund needed)
  - `CatalogCandidate` queue >50 pending (admin attention)
  - Any `ErrorLog` entry with `source='bot'` AND `where` starting with `delivery_`

### Tasks

- [x] **10.1** Reuse `lib/notify.ts` (existing Discord webhook for gems)
      with a new channel ID env: `DISCORD_ITEM_OPS_WEBHOOK_URL`.
      — _`lib/discord-item-ops.ts` with 5 alert kinds. **VERIFY**: webhook URL needs to be set in production env (silent no-op when unset, by design)._
- [x] **10.2** `lib/error-log.ts` exists — add helpers for item flow:
      `logDeliveryError(jobId, where, err)`, `logDepositError(sessionId, where, err)`.
      — _added `logDeliveryError`, `logDepositError`, `logWithdrawalError` (all use `source='bot'`)_
- [x] **10.3** Cron `/api/cron/marketplace-monitor` (every 5 min):
      checks queue depth, stuck jobs, candidate backlog → fires Discord webhook
      if any threshold breached. — _`app/api/cron/marketplace-monitor/route.ts`; thresholds: stuck>15min, failed in last hour, candidates>=50_
- [x] **10.4** `/admin/marketplace/dashboard` — live numbers: today's
      deposits/listings/sales/withdrawals + outstanding job counts.
      — _live grid; sidebar entry "Marketplace"; auto-refreshes every 30s_
- [ ] **10.5** Bot daemon writes `BotState['daemon:status']` every 30s with
      current job kind, started_at. Stale → site bot-status endpoint shows
      offline.

---

## Phase 11 — Security audit

**Goal**: catch issues that could let an attacker steal items, double-spend,
or grief the bot.

### Tasks

- [ ] **11.1** Penetration test: try to buy a listing with insufficient
      wallet balance via race condition (parallel POSTs to `buy`).
- [ ] **11.2** Penetration test: try to list an item you don't own (header
      manipulation, IDOR on `/api/vault/[id]/list`).
- [ ] **11.3** Penetration test: forge `x-bot-api-key`. Timing-safe compare
      should defeat this; verify with a string-prefix attack benchmark.
- [x] **11.4** Roblox-side: what stops a user from joining the bot's
      server, getting a trade request, declining, then opening a fresh
      DepositSession to grief the queue? Add rate-limit per Roblox user ID
      (max 3 active or expired sessions per hour). — _in-memory token bucket on `/api/vault/deposit` (3/hour per user.id)_
- [ ] **11.5** What if the bot account's password leaks? Document the
      revoke-and-reissue procedure: rotate session cookie via Roblox web,
      revoke BOT_API_KEY on site, re-deploy emulator config.
- [x] **11.6** Audit log: every wallet credit/debit, every item state
      transition. Already present via `TransactionLedger` for money; add
      `ItemStateLog` table for vault item status changes.
      — _table + migration applied; **VERIFY**: insertion wrapper helper not yet wired into the state-change call sites (purchaseListing, refundListingPurchase, deposit-complete, delivery-complete). Add in a follow-up so every transition writes a log row._
- [ ] **11.7** Verify `tradable` enforcement is actually defense-in-depth.
      Roblox blocks Untradables in trade slots, but if Roblox's check ever
      fails the bot must not deposit/deliver them.

---

## Phase 12 — Production rollout

**Goal**: ship to real users without breaking the existing gem business.

### Tasks

- [ ] **12.1** Feature flag `SiteSettings.itemMarketplaceEnabled` (default
      false). Gates `/vault`, `/marketplace`, all `/api/vault/*` and
      `/api/marketplace/*` endpoints.
- [ ] **12.2** Soft launch: enable for admin accounts only via wallet
      flag. Run 20+ end-to-end deposits and 20+ deliveries with admins.
- [ ] **12.3** Discord beta: invite ~20 power users from the SD Discord to
      test the flow before public launch.
- [ ] **12.4** Marketing: shop page nav update (`SHOP_CATEGORIES`), homepage
      hero copy, FAQ entries for "How does item trading work?".
- [ ] **12.5** Public flip: set `itemMarketplaceEnabled = true`. Watch
      `/admin/marketplace/dashboard` for the first 24 h.
- [ ] **12.6** Post-launch: document operational runbook in
      `docs/RUNBOOK_MARKETPLACE.md` — how to refund a failed delivery, how
      to handle a misbehaving user, how to rotate keys.

---

## Phase 13 — Backlog / future / nice-to-haves

Sketch level only. Pick from here only when 4–12 are complete.

- [ ] **13.1** Listing offers: buyers can offer below asking price; sellers
      accept/decline.
- [ ] **13.2** Auctions: time-limited bidding instead of fixed price.
- [ ] **13.3** Trade-history per listing — show how often this item type has
      sold + recent prices for buyer confidence.
- [ ] **13.4** Bulk-deposit mode: user drags 10 items, bot processes them
      faster by skipping per-item OCR re-confirmation.
- [ ] **13.5** Bot multi-emulator: run 2-3 bots in parallel so multiple
      deposits/deliveries can happen concurrently.
- [ ] **13.6** Recommend-listing-price model: based on
      sniperduelsvalues.com prices + catalog stats, suggest a price band
      when user lists an item.
- [ ] **13.7** Inventory mirroring: cache the bot's known inventory in
      Postgres so we can show users "we have N of these in stock" without
      a sweep.
- [ ] **13.8** Cross-game catalog: when SD adds a new game mode with
      different items (e.g. Sniper Duels 2), this whole pipeline applies as
      long as items are tradable and tooltips render similarly.

---

## How to drive this autonomously

If a `/loop` is launched at this doc:

1. Open this file.
2. Find the highest-priority phase with unticked tasks (`[ ]`).
3. Within that phase, pick the lowest-numbered unticked task.
4. **Check dependencies** — if a depended-on task is unticked, switch to that one.
5. **Check stop conditions** — if the task is `Blocked` (level 8, prod webhook touching), stop and report.
6. Read the task description carefully. If it has a "Sketch" section, that's the design — implement it. If it's a "Hardening" task, find the relevant file via grep and apply the change.
7. Run type-check + relevant tests. If green, mark `[x]` and commit.
8. Move to next task.

Each loop iteration should land **one** ticked checkbox + one commit, so it's
trivial to roll back a single iteration if needed.
