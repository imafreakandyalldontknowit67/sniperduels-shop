# Item Marketplace — How It All Works (rough draft + status)

> Companion to `ITEM_MARKETPLACE_ROADMAP.md` (the build-phase plan, 2026-05-31).
> This doc is the **current-state snapshot + end-to-end architecture** as of **2026-06-04**,
> plus a **go-live roadmap** sequenced "first live trade first." It's a rough draft — expect
> to iterate.

---

## 1. Overview

`sniperduels.shop` is becoming a **player-driven item marketplace** on top of the existing
gem shop. Two **separate** Roblox bots, separate accounts, separate heartbeats, never
cross-wired:

| | **Gem bot** (live, proven) | **Item / "depo" bot** (built, unproven) |
|---|---|---|
| Repo | (legacy Python trade bot) | `sniperduels-item-bot` |
| Drives | gem trades | item trades on **MuMu Android emulator** via ADB + OCR |
| Site contract | `/api/bot/orders/*` (polls ALL pending orders) | `/api/bot/v1/*` (pulls ONE job at a time) |
| Heartbeat | `/api/bot/heartbeat` (`lib/bot-heartbeat.ts`) | `/api/bot/v1/heartbeat` (`lib/itembot-heartbeat.ts`) |
| Outage UI | `OutageBanner` (wallet-flavored) | `MarketplaceOutageBanner` (queue-flavored, 9 states) |

The marketplace lets a user **deposit** Roblox items into the bot's custody, **list** them at
a price, lets buyers **buy** them on the site, and the bot **delivers** the exact item in-game.
Sellers' proceeds land in their site **wallet**; they **withdraw** items they didn't sell, or
**cash out** wallet balance.

---

## 2. Status snapshot (verified 2026-06-04)

### Depo bot — `C:\Users\imbou\Downloads\Programs\sniperduels-item-bot`

| Piece | State |
|---|---|
| Daemon poll loop + watchdog + heartbeat (`bot/daemon.py`) | ✅ built |
| Deposit / delivery / withdraw flows (`bot/{deposit,withdraw}_flow.py`, `workflows/`) | ✅ coded |
| OCR fingerprinting (`bot/parse_tooltip.py`, +`_v2`/`_fast`) | ✅ **97.8%** name accuracy proven |
| Trade send/watch, item find, health, anti-AFK, ADB client | ✅ built & unit-proven |
| Site client (`bot/site_api.py`) speaks `/api/bot/v1/*` | ✅ matches contract (auth `x-bot-api-key`) |
| **Account at Level 7 — can't trade until L8** | 🚫 **blocks all live trade accept/deliver** |
| **Not a git repo** | 🚫 no version control / not Coolify-deployable |
| **Windows + MuMu, local PC only** (no Dockerfile) | 🚫 not on VPS, not unattended-prod |
| Safe mode default (`BOT_DAEMON_ENABLED=0`) | ⚠️ won't call site until explicitly enabled |

**Net:** every step is coded and the OCR is proven, but **no trade has completed live** because
the account can't initiate trades yet. That's the #1 unknown.

### Site — `feature/marketplace-icons-ux` (**+19 / −7 vs `main`**, dev-preview only)

| Piece | State |
|---|---|
| Grid / detail / buy / similar / order-tracking UI | ✅ built (icon-first) |
| Vault APIs: `deposit`, `list`, `unlist`, `withdraw`, `sessions` | ✅ built |
| Bot queue `/api/bot/v1/*`: jobs/next, deposit & delivery complete/failed, heartbeat, catalog-candidate | ✅ built |
| `lib/marketplace.ts` (`purchaseListing`, `refundListingPurchase`), 3% fee, seller wallet credit | ✅ built |
| Item-bot heartbeat + `MarketplaceOutageBanner` (9 states) | ✅ built |
| Dev preview serves **demo data** (`DEMO_MARKETPLACE_DEFAULT`, `NEXT_PUBLIC_DEMO_MARKETPLACE`) | ✅ by design |
| Item models only in **raw SQL migrations** (`prisma/migrations/20260531*`), **not in `schema.prisma`** | ⚠️ schema drift; routes use raw SQL |
| **No `/api/bot/v1/withdrawal-jobs/[id]/complete\|failed`** | 🚫 bot can't close withdrawals (falls back to delivery endpoint) |
| Item platform fee **hard-coded 3%** (gems are per-seller `platformFeeRate`) | ⚠️ inconsistent |
| **No auto-refund worker** for stuck `processing` item orders | ⚠️ manual admin only |
| Branch unmerged + **7 commits behind `main`** (missing SEO + gem-cap fixes) | ⚠️ needs `main` merged in before prod |

> ⚠️ Per repo `CLAUDE.md`: **never merge this branch to `main` or deploy it to the prod shop app**
> (`vosooo8ws8kksgo8wgwsss48`) without sign-off. Use the dev-preview app
> (`zsws0408scgk008s80w80s4w`) only.

---

## 3. End-to-end flows

Status legend per hop: ✅ built · 🚫 missing · ⚠️ built-but-unproven-live.

### 3a. Deposit (user → bot custody → vault)
```
user                site                         item bot (emulator)
 │  create session   │                                  │
 ├──POST /api/vault/deposit──────────▶ ItemDepositSession{status:pending}
 │                   │  GET /api/bot/v1/jobs/next ◀──────┤ (poll)
 │                   ├──{kind:deposit, job}──────────────▶ trade-request user, SWEEP+OCR items,
 │                   │                                     ACCEPT, AWAIT close, INSPECT-match
 │                   │  POST deposit-sessions/{id}/complete{items[]} ◀──┤
 │                   ├─ create VaultItem{status:deposited} (×N), session→completed
```
Endpoints: `/api/vault/deposit` ✅ → `jobs/next` ✅ → `deposit-sessions/{id}/complete` ✅ (or
`/cancel` ✅). Models: `ItemDepositSession`, `VaultItem`. **Live: ⚠️ unproven past trade-accept (L7).**

### 3b. List
`user → POST /api/vault/[id]/list {priceUsd}` ✅ → `VaultItem: deposited → listed` + `VendorItemListing`
row → shows in `/api/marketplace/items`. (`/unlist` ✅ reverses.)

### 3c. Buy (buyer → order + queued delivery)
```
buyer                       site
 ├─ POST /api/marketplace/items/[id]/buy {method, robloxName}
 │     └▶ purchaseListing(): VaultItem listed→reserved
 │        Order{type:item, status: processing(wallet) | pending(Pandabase)}
 │        ItemDeliveryJob{status:queued}
 │   wallet → charged now;  Pandabase → webhook flips order→processing
```
Endpoints: `/api/marketplace/items/[id]/buy` ✅ → `/api/orders/purchase` ✅. Models: `Order`,
`ItemDeliveryJob`, `VaultItem`. ✅ built.

### 3d. Deliver (bot → buyer)
```
site                                   item bot
 │ GET jobs/next ◀───────────────────────┤ (poll)
 │  (delivery returned ONLY if Order.status ∈ {processing,completed})
 ├─{kind:delivery, job{deliveryId, buyerRobloxName, expectedFingerprint,…}}─▶
 │                                        trade buyer, pick exact item (OCR match), OFFER, ACCEPT
 │ POST delivery-jobs/{id}/complete ◀─────┤
 ├─ Job→completed; VaultItem→sold; Order→completed; seller wallet += sale −3% fee
 │ (or POST .../failed{reason,retryable} → retry≤3 else Job→failed, VaultItem→listed, refund)
```
Endpoints: `jobs/next` ✅, `delivery-jobs/{id}/complete` ✅, `/failed` ✅. **Live: ⚠️ unproven (L7).**

### 3e. Withdraw (user reclaims an unsold item)  — **has a gap**
```
user → POST /api/vault/[id]/withdraw ✅ → ItemWithdrawalJob{status:queued}
bot  → GET jobs/next ✅ → {kind:withdrawal, job} → trades item back to user
bot  → 🚫 NO /api/bot/v1/withdrawal-jobs/{id}/complete|failed  → currently falls back to delivery endpoint
```
**Gap:** withdrawal completion endpoints don't exist; withdrawal can't be closed correctly.

### 3f. Cashout (designed, not built)
Seller wallet balance → payout request → **NOWPayments Mass Payout** (crypto v1). Mirrors the
gem vendor payout path (`/api/vendor/withdrawals`). Not yet wired for item sellers.

### Liveness
Bot `POST /api/bot/v1/heartbeat` every 30s → `lib/itembot-heartbeat.ts` caches state in `BotState`
→ `/api/itembot/status` → `useItemBotStatus` (30s poll) → `MarketplaceOutageBanner`. Offline after
120s silence. ✅ built.

---

## 4. Integration contract (`/api/bot/v1/*` ↔ `bot/site_api.py`)

| Bot call (`site_api.py`) | Site route | Match? |
|---|---|---|
| `get_next_job()` GET | `/api/bot/v1/jobs/next` | ✅ |
| `deposit_complete(id, items)` POST | `/api/bot/v1/deposit-sessions/[id]/complete` | ✅ |
| `deposit_cancel(id, reason)` POST | `/api/bot/v1/deposit-sessions/[id]/cancel` | ✅ |
| `delivery_complete(id)` POST | `/api/bot/v1/delivery-jobs/[id]/complete` | ✅ |
| `delivery_failed(id, reason, retryable)` POST | `/api/bot/v1/delivery-jobs/[id]/failed` | ✅ |
| `report_catalog_candidate(...)` POST | `/api/bot/v1/catalog-candidate` | ✅ |
| `heartbeat(payload)` POST | `/api/bot/v1/heartbeat` | ✅ |
| *(withdrawal completion)* | **— none —** | 🚫 **GAP** |

Auth on every call: header `x-bot-api-key` (timing-safe compare to `BOT_API_KEY`). Job-poll rate-limited 30/min.

---

## 5. Gaps & risks (ranked)

1. 🚫 **Live trade never proven** — account stuck at **Level 7** (needs L8 to initiate trades). The
   single biggest unknown for the whole product.
2. 🚫 **Bot not git-tracked, local-only, no Dockerfile** — can't run unattended / on the VPS / be deployed.
3. 🚫 **Withdrawal completion endpoints missing** — `/api/bot/v1/withdrawal-jobs/[id]/complete|failed`.
4. ⚠️ **Schema drift** — item models live only in raw SQL migrations, not `schema.prisma`; routes use
   raw SQL. (The 2026-05-31 roadmap shows them as Prisma models — they shipped as SQL instead.)
5. ⚠️ **Item fee hard-coded 3%** vs gems' per-seller `platformFeeRate`.
6. ⚠️ **No auto-refund worker** for stuck `processing` item orders (gems have a 30-min settle on
   heartbeat reconnect; items don't).
7. ⚠️ **Branch unmerged + 7 behind `main`** — needs `main` merged in (SEO/gem-cap) before any prod path.
8. ⚠️ **Two divergent bot contracts** (`/api/bot/orders/*` vs `/api/bot/v1/*`) — fine for now, but
   double the surface to maintain.

---

## 6. Go-live roadmap (first live trade first)

- **Phase 0 — first live E2E trade *(do this before more build)*.**
  - Gating: play the bot's Roblox account to **Level 8**.
  - Prereqs: `git init` the bot repo; stand up a **staging** site (feature branch, **demo OFF**, item
    SQL migrations applied to its DB); set `SITE_API_BASE`, `BOT_API_KEY`, `BOT_DAEMON_ENABLED=1`;
    create a real deposit session + list + buy.
  - **Success = one deposit AND one delivery complete end-to-end**, with `VaultItem`/`Order`/job rows
    transitioning correctly and the seller wallet credited.
- **Phase 1 — close site gaps:** add `withdrawal-jobs/[id]/complete|failed`; fold item models into
  `schema.prisma`; per-seller item fee; auto-refund worker.
- **Phase 2 — deploy/harden the bot:** containerize or dedicate an always-on host with MuMu; keep the
  watchdog; move off the operator's PC.
- **Phase 3 — productionize:** merge `main` → feature branch; `/security-review`; soft-launch behind a
  flag on prod; flip demo off.

---

## Key files

**Site (feature branch):** `app/marketplace/*`, `app/api/marketplace/*`, `app/api/bot/v1/*`,
`app/api/vault/*`, `app/api/orders/purchase/route.ts`, `lib/marketplace.ts`,
`lib/itembot-heartbeat.ts`, `hooks/useItemBotStatus.ts`, `components/MarketplaceOutageBanner.tsx`,
`prisma/migrations/20260531*`.
**Bot:** `bot/daemon.py`, `bot/site_api.py`, `bot/{deposit,withdraw}_flow.py`, `bot/workflows/*`,
`bot/parse_tooltip.py`, `scripts/start-bot.ps1`, `recon/{CONTROL_PROOF,DEPOSIT_FLOW,CAVEATS}.md`.
