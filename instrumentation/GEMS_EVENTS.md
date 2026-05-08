# Gems Checkout — PostHog Event Catalog

All events fire from `app/gems/page.tsx`. Property names below are the canonical names that downstream HogQL / dashboards rely on — do not rename.

USD-denominated money fields are floats (e.g. `2.90`, `12.50`). Quantities are integers (in either `k` or raw gems). `currency` is the user's display currency from `CurrencyProvider` (e.g. `USD`, `EUR`, `CAD`); the underlying `amount` / `price_usd` values are always normalized to USD regardless.

---

## `gems_listing_selected`
Fires when the user picks a price tier (Official Stock or a vendor) from the right-column selector.

| Property | Type | Notes |
|---|---|---|
| `type` | `'platform' \| 'vendor'` | legacy (kept) |
| `rate` | `number` | legacy (kept) — USD per `k` |
| `listing_id` | `string` | `'platform'` or vendor listing id |
| `gems_qty` | `number` | raw gems = `amount_k * 1000` |
| `price_usd` | `number` | total at this rate for the active amount |
| `currency` | `string` | display currency from `CurrencyProvider` |
| `vendor_id` | `string \| null` | `null` for the platform listing |
| `vendor_name` | `null` | not exposed by `/api/gems/listings` (skipped) |
| `discount_pct` | `number \| null` | `null` unless the active bulk-tier rate is below the listing's base rate |

Example payload:
```json
{
  "type": "platform",
  "rate": 2.65,
  "listing_id": "platform",
  "gems_qty": 100000,
  "price_usd": 265,
  "currency": "USD",
  "vendor_id": null,
  "vendor_name": null,
  "discount_pct": 0.086
}
```

---

## `gems_amount_changed`
Fires when the user changes the K-amount via preset, +/-, input, or (future) slider.

| Property | Type | Notes |
|---|---|---|
| `amount_k` | `number` | legacy (kept) |
| `source` | `'preset' \| 'input' \| 'slider' \| '+' \| '-'` | how the change was triggered |
| `amount` | `number` | total USD at the active rate |
| `gems_qty` | `number` | raw gems |
| `price_usd_per_gem` | `number` | `rate / 1000` |
| `currency` | `string` | display currency |
| `listing_id` | `string \| null` | active listing context (null pre-hydration) |

Example payload:
```json
{
  "amount_k": 25,
  "source": "preset",
  "amount": 72.5,
  "gems_qty": 25000,
  "price_usd_per_gem": 0.0029,
  "currency": "USD",
  "listing_id": "platform"
}
```

---

## `gems_purchased`
Fires after `/api/orders/purchase-gems` returns 2xx, immediately before navigating to the order page.

| Property | Type | Notes |
|---|---|---|
| `amount_k`, `gems_k`, `total_price`, `amount_usd`, `base_price_usd`, `rate_per_k`, `listing_type`, `has_loyalty_discount`, `has_discord_discount`, `from` | various | legacy (kept) |
| `listing_id` | `string` | |
| `vendor_id` | `string \| null` | `null` for platform |
| `discount_pct` | `number` | combined Discord+loyalty discount applied |
| `amount` | `number` | USD total (post-discount) |
| `gems_qty` | `number` | raw gems |
| `price_usd` | `number` | USD total (post-discount) |
| `currency` | `string` | display currency |
| `intent_id` | `string \| null` | `?resumeBuy=` value if user came back from OAuth |
| `is_repeat_purchase` | `boolean \| null` | client-side check via `last_gems_purchase_ts` localStorage — `true` if previous purchase < 30 days, `false` if first purchase, `null` if localStorage unavailable |

Example payload:
```json
{
  "amount_k": 50,
  "gems_qty": 50000,
  "amount": 141.38,
  "price_usd": 141.38,
  "base_price_usd": 145.0,
  "rate_per_k": 2.9,
  "listing_id": "platform",
  "listing_type": "platform",
  "vendor_id": null,
  "discount_pct": 0.025,
  "currency": "USD",
  "intent_id": null,
  "is_repeat_purchase": true,
  "from": "web"
}
```

---

## `gems_buy_clicked`
Fires when the "Finish Purchase" button is clicked (after the user is logged in). Fires before any blocking checks.

| Property | Type | Notes |
|---|---|---|
| `amount_k`, `total_price` | | legacy (kept) |
| `amount` | `number` | USD total |
| `gems_qty` | `number` | raw gems |
| `listing_id` | `string \| null` | |
| `auth_state` | `'logged_in' \| 'logged_out'` | always `logged_in` here in practice (the logged-out CTA is "Login to Buy" → fires `gems_buy_blocked` instead) |
| `current_balance_usd` | `number \| null` | wallet balance, `null` if not logged in |
| `has_sufficient_balance` | `boolean \| null` | `null` if not logged in |

---

## `gems_buy_blocked`
Fires when a buy attempt is blocked. The existing `reason` discriminator is preserved.

| Property | Type | Notes |
|---|---|---|
| `reason` | `'bot_offline' \| 'insufficient_balance' \| 'insufficient_balance_modal_add_funds' \| 'not_logged_in'` | (legacy) |
| `amount_k`, `balance`, `required` | | (legacy where applicable) |
| `amount` | `number` | USD total at current rate |
| `listing_id` | `string \| null` | |
| `auth_state` | `'logged_in' \| 'logged_out'` | |
| `current_balance_usd` | `number \| null` | `null` for `not_logged_in` |
| `required_balance_usd` | `number` | discounted total |
| `gap_usd` | `number \| null` | `required - current`; `null` for `not_logged_in` |

---

## `gems_confirm_modal_opened`
Fires when the confirmation modal becomes visible (inside `handlePurchaseClick`, after the bot-offline guard passes).

| Property | Type | Notes |
|---|---|---|
| `amount_k`, `total_price` | | legacy |
| `amount` | `number` | USD total |
| `gems_qty` | `number` | raw gems |
| `listing_id` | `string \| null` | |
| `vendor_id` | `string \| null` | |

---

## `gems_confirm_modal_closed`
Fires from every modal-close path, including confirm-success.

| Property | Type | Notes |
|---|---|---|
| `amount_k`, `total_price`, `reason` | | legacy (`reason ∈ {'dismissed','cancelled','confirmed'}`) |
| `amount` | `number` | USD total |
| `closed_via` | `'x_button' \| 'cancel_button' \| 'outside_click' \| 'escape_key' \| 'confirmed'` | `outside_click` and `escape_key` are not currently wired (the modal does not handle those gestures); other values fire from their respective click handlers |
| `gems_qty` | `number` | raw gems |
| `listing_id` | `string \| null` | |

---

## `gems_resume_buy_hydrated`
Fires once after a `?resumeBuy={id}` round-trip, when the listing + amount have been restored and the confirm modal is auto-opened.

| Property | Type | Notes |
|---|---|---|
| `intent_id` | `string` | from `?resumeBuy=` |
| `amount_k` | `number` | restored amount |
| `intent_age_seconds` | `number \| null` | `(TTL=600s) - secondsUntilExpiry`. `null` if `expiresAt` is malformed. |
| `from_oauth_callback` | `true` | `?resumeBuy` is only ever set by the post-OAuth redirect path, so this is always `true` at this call site |
| `restored_amount` | `number` | same as `amount_k` |
| `restored_listing_id` | `string` | id of the listing that was hydrated |

Example payload:
```json
{
  "intent_id": "ck9f...",
  "amount_k": 25,
  "intent_age_seconds": 47,
  "from_oauth_callback": true,
  "restored_amount": 25,
  "restored_listing_id": "platform"
}
```

---

## Skipped properties (and why)
- **`gems_listing_selected.vendor_name`** — `/api/gems/listings` only exposes `vendorId`; sending `vendor_name` would require a separate lookup or an API change which is out of scope for this branch. Set to `null`.
- **`gems_confirm_modal_closed.closed_via=outside_click|escape_key`** — the current modal markup does not bind backdrop-click or Escape handlers, so those values are reserved but never emitted. If those gestures are added later, capture them with the matching value.
- **`gems_buy_blocked.gap_usd` (when `auth_state=logged_out`)** — there is no wallet balance for an anonymous user, so the gap is undefined; sent as `null`.
- **`gems_buy_clicked` while logged out** — the logged-out CTA is "Login to Buy", which fires `gems_buy_blocked{reason:'not_logged_in'}` rather than `gems_buy_clicked`. So `auth_state=logged_in` is the only realistic value seen in this event.
