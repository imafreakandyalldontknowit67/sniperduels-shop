# Item Marketplace Roadmap

The roadmap to turn `sniperduels.shop` from a **gem-sales site** into a full
**player-driven item marketplace** powered by an Android-emulator bot that
reads Roblox tooltips via OCR.

Status snapshot (2026-05-31):

- ✅ **Bot**: OCR pipeline at 97.8% name accuracy + full fingerprint (rarity / condition / fragtrakr / fx / kills / quickscope_kills / crate / exist) — see `../../../sniperduels-item-bot/recon/CAVEATS.md`.
- ✅ **Bot**: `bot.parse_tooltip.fingerprint_matches()` for trade verification, `bot.find_target_item.find_target_item()` for inventory pick.
- ✅ **Site Phase 1**: constants aligned with in-game data, rarity colors corrected, `data/item-catalog.json` seeded with 215 items.
- ⏭ **Site Phase 2** (next): catalog DB schema + auto-indexing of unknown items.
- ⏭ **Site Phase 3**: vault / listings / delivery flow.
- ⏭ **Site Phase 4**: vendor-side admin tools + payouts integration.
- ⏭ **Bot+Site Phase 5**: live deposit + delivery flow (blocked on bot account level 8).

---

## Phase 1 — Constants & catalog seed (✅ DONE)

`lib/constants.ts`, `data/item-catalog.json`, `lib/itemCatalog.ts`, rarity
color fixes across `app/shop/page.tsx` + `app/admin/stock/page.tsx`.

Verified in-game color/rarity correspondence:

| Rarity | Bar color | OCR detection |
|---|---|---|
| Common | silver / bright low-sat | `is_gray_bar()` |
| Uncommon | green | hue 36–65 |
| Rare | blue (deeper) | hue 96–130 + OCR disambiguator |
| Epic | gold | hue 18–35 |
| Legendary | purple | hue 131–165 |
| Collectable | cyan | hue 85–95 + OCR disambiguator |
| **Secret** | **near-black / dark low-sat** | `is_dark_bar()` |
| **Knife** (not a rarity — knives only) | **red** | hue 0–17 / 170–180 → `type='knife'` |

---

## Phase 2 — Catalog DB + auto-indexing (NEXT)

**Goal**: stop storing the catalog as a static JSON file; make it a first-class
DB table that the bot can extend automatically as new items appear in-game.

### Schema additions (Prisma)

```prisma
model ItemCatalog {
  id          String   @id @default(cuid())
  name        String   @unique  // "WEAPON | SKIN" uppercase
  weapon      String
  skin        String
  type        String   // 'sniper' | 'knife'
  crate       String?
  slug        String?  // sniperduelsvalues.com slug
  source      String   @default("manual") // manual | sniperduelsvalues | bot_observed | sweep
  active      Boolean  @default(true)
  firstSeenAt DateTime @default(now())

  @@index([weapon])
  @@index([type, active])
}

model CatalogCandidate {
  id            String   @id @default(cuid())
  ocrName       String                    // canonical raw "WEAPON | SKIN" from bot OCR
  weapon        String?
  skin          String?
  rarity        String?                   // bot's best guess
  condition     String?
  fragtrakr     Boolean  @default(false)
  fx            String?
  crate         String?
  observedCount Int      @default(1)      // increments each time bot re-sees it
  firstSeenAt   DateTime @default(now())
  lastSeenAt    DateTime @default(now())
  screenshotUrl String?                   // S3/static-hosted tooltip crop
  status        String   @default("pending") // pending | approved | rejected | duplicate
  approvedAsId  String?                   // FK to ItemCatalog.id when approved
  notes         String?

  @@index([status])
  @@index([ocrName])
}
```

### Migrations

1. Create `ItemCatalog` and `CatalogCandidate` tables.
2. Seed `ItemCatalog` from `data/item-catalog.json` once (idempotent upsert).
3. After seed succeeds, `data/item-catalog.json` becomes a deploy-time fallback only (not the runtime source of truth).

### Endpoints

- `POST /api/bot/v1/catalog-candidate` — bot reports an unknown OCR'd name + fingerprint. Server upserts on `ocrName`, increments `observedCount`, refreshes `lastSeenAt`.
- `GET /api/admin/catalog/candidates?status=pending` — admin lists pending candidates with screenshot + observation count.
- `POST /api/admin/catalog/candidates/:id/approve` — admin approves; server creates `ItemCatalog` row + links candidate.
- `POST /api/admin/catalog/candidates/:id/reject` — admin rejects with reason.

### Admin UI

- `/admin/catalog` — full catalog table with weapon/type/crate filters, search.
- `/admin/catalog/pending` — review queue: shows OCR'd name, observation count, last seen, screenshot. Approve/reject actions inline.

### Bot integration

- `bot/parse_tooltip.py` already has a `_snap_weapon`+`_snap_skin` step. When a tooltip is OCR'd and `snap_name()` returns `None` (raw-acceptance fallback path), bot calls `POST /api/bot/v1/catalog-candidate` with the full fingerprint.
- `bot/dataset_sweep.py` ("Top-trader sweep" mode) runs periodically — visits the top-10 trade-list players, hover-sweeps their inventories, reports unknowns.

### sniperduelsvalues.com auto-refresh (Phase 2 — implemented)

- `scripts/sync-catalog-from-values.ts` — bidirectional reconciliation:
  1. Upserts each JSON entry into `ItemCatalog` (creates new with `source='sniperduelsvalues'`, refreshes metadata on existing).
  2. **Auto-approves pending candidates whose `ocrName` matches a newly-inserted catalog row** — the values site confirms what the bot already saw.
  3. **Back-fill pass**: auto-approves any old pending candidate whose `ocrName` matches an existing catalog row (covers candidates created before catalog grew).
- Run nightly via Coolify scheduled task: `npx tsx scripts/sync-catalog-from-values.ts --regen`
  - `--regen` first re-scrapes via `generate-item-catalog.mjs`.
  - Without flag, just syncs from existing JSON (useful for manual reseeds).

---

## Phase 3 — Vault & listings schema

```prisma
model VaultItem {
  id             String   @id @default(cuid())
  userId         String
  catalogId      String                       // FK to ItemCatalog
  fingerprint    Json                         // full OCR fingerprint (kills, condition, fx, etc.)
  status         VaultItemStatus @default(deposited)
  depositedAt    DateTime
  listedAt       DateTime?
  soldAt         DateTime?
  withdrawnAt    DateTime?
  // For bot's quick-pick at delivery time. Stale after inventory shuffles.
  lastSeenCellHint Json?

  user    User        @relation(fields: [userId], references: [id])
  catalog ItemCatalog @relation(fields: [catalogId], references: [id])
  listing VendorItemListing?

  @@index([userId, status])
  @@index([status])
}

enum VaultItemStatus {
  deposited      // in bot inventory, not listed
  listed         // active marketplace listing
  sold           // delivered to buyer, archived
  withdrawing    // user requested return, bot working on it
  withdrawn      // returned to user
}

model VendorItemListing {
  id          String   @id @default(cuid())
  vaultItemId String   @unique
  priceUsd    Decimal  @db.Decimal(12, 2)
  minOfferUsd Decimal? @db.Decimal(12, 2)
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  vaultItem VaultItem @relation(fields: [vaultItemId], references: [id])

  @@index([active, priceUsd])
}

model ItemDepositSession {
  id            String   @id @default(cuid())
  userId        String
  status        String   @default("pending")  // pending | bot_in_trade | completed | cancelled | expired
  mode          String   @default("auto_detect")  // auto_detect | declared
  declaredItems Json?    // [{ catalogId, fingerprint }] when mode=declared
  createdAt     DateTime @default(now())
  expiresAt     DateTime
  completedAt   DateTime?

  @@index([userId, status])
  @@index([expiresAt])
}

model ItemDeliveryJob {
  id             String   @id @default(cuid())
  vaultItemId    String
  orderId        String   @unique
  buyerUserId    String
  buyerRobloxName String
  status         String   @default("queued")  // queued | bot_in_trade | completed | failed
  attempts       Int      @default(0)
  lastError      String?
  createdAt      DateTime @default(now())
  startedAt      DateTime?
  completedAt    DateTime?

  vaultItem VaultItem @relation(fields: [vaultItemId], references: [id])

  @@index([status, createdAt])
}
```

### UI

- `/vault` — user's deposited items, status badges, "set price / list" + "withdraw" actions.
- `/marketplace/items` — public listings, filter by weapon/type/rarity/fx/condition.
- `/marketplace/items/[id]` — single listing detail + buy button.

---

## Phase 4 — Bot-facing API

The bot daemon polls these endpoints and posts results. Site is the source of truth; bot is stateless between jobs.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/bot/v1/jobs/next` | next pending job (deposit-watch / delivery / withdrawal). 30s long-poll. |
| `POST` | `/api/bot/v1/deposit-sessions/:id/detected` | bot reports items currently visible in trade window during a deposit |
| `POST` | `/api/bot/v1/deposit-sessions/:id/complete` | bot reports trade completed; lists items now in inventory with fingerprints |
| `POST` | `/api/bot/v1/delivery-jobs/:id/started` | bot took the job |
| `POST` | `/api/bot/v1/delivery-jobs/:id/complete` | bot delivered the item |
| `POST` | `/api/bot/v1/delivery-jobs/:id/failed` | bot couldn't deliver (item missing, user offline, etc.) |
| `POST` | `/api/bot/v1/catalog-candidate` | unknown item observed (Phase 2 endpoint) |
| `POST` | `/api/bot/v1/heartbeat` | bot health ping, existing pattern (gem-bot already uses this) |

All endpoints behind a `BOT_API_TOKEN` header.

---

## Phase 5 — Live deposit + delivery integration

**Blocked**: bot account needs to reach level 8 to actually open a Roblox trade window. Use sandbox accounts in the meantime to dry-run the bot ↔ site contract.

When unblocked:
1. Calibrate trade-window OCR (separate crop layout from VIEW ITEMS panel).
2. Wire `find_target_item` into the bot's `run_deposit()` and `run_delivery()` workers.
3. End-to-end test: deposit → vault → list → buy → deliver → re-verify.

---

## Cleanup — files to remove (low risk)

| File | Reason |
|---|---|
| `scripts/_ssh.py` | **Hardcoded VPS password** — security risk |
| `scripts/_ssh_recon.py` | One-off recon utility, completed |
| `scripts/_apply_migration.py` | Pre-Prisma manual migration applier |
| `scripts/_apply_fx_migration.py` | Pre-Prisma FX migration applier |
| `scripts/_credit_mel41798.py` | One-off user credit, task complete |
| `scripts/_reconcile_2026-05-09T05-14-49-284Z.csv` | One-off artifact |
| `schema-implementation-guide.tsx` | Reference doc, never imported |
| `schema-recommendations.jsonld` | Reference doc, never executed |
| `extreme-smoke-results.json` | Generated output from a smoke test run |

Already gitignored, can be force-removed from local working dir:
- `upgrade-snapshots/` (CVE test screenshots)
- `tasks.json`, `tasks.results.json`, `tasks.review.json`
- `swagger.json`

Leave alone (might be useful again):
- `extreme-smoke.mjs`, `form-smoke.mjs`, `http-smoke.mjs`, `visual-diff.mjs` — dev tooling

---

## Stale code to revisit (not deleting yet)

- `data/{deposits,gem-stock,orders,stock,users}.json` — legacy JSON seeds. Migrated to Postgres. Keep until next major release as a fallback path, then remove.
- `scripts/clear-pending.sh` — pre-Pandabase admin script. Replace with an admin-panel action.
- `scripts/check-vendor-stock.ts` — possibly superseded by `/admin/vendors`. Verify, then remove.
