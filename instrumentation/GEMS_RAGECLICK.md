# /gems Rage-Click Instrumentation

PostHog logged 2,481 `$rageclick` events in the last 7 days; 2,324 of them were on `/gems` (~1 rage-click per 1.9 page views). Autocapture's CSS-selector attribution alone wasn't enough to pinpoint which element was being mashed, so this work adds explicit per-element instrumentation we can group by.

## Files touched

- `app/gems/page.tsx` — `data-ph-id` on every interactive element + a top-level click handler that fires `gems_element_clicked` and (when applicable) `gems_disabled_button_clicked`.
- `components/providers/PostHogProvider.tsx` — `before_send` enrichment that stamps the closest `data-ph-id` ancestor onto autocaptured events (including `$rageclick`) as `target_element_id`. Session recording is gated to be always-on for `/gems` and sample-rated elsewhere.
- `components/providers/PostHogPageView.tsx` — unchanged (already minimal pageview tracker).

## `data-ph-id` registry

Every interactive element on `/gems` gets a stable `data-ph-id`. When the same id appears multiple times (listing cards), per-instance metadata is carried in `data-ph-listing-id` / `data-ph-listing-type` and surfaced on the event payload as `current_listing_id` / `current_listing_type`.

| `data-ph-id` | Element | Notes |
|--------------|---------|-------|
| `gems-toast-close` | Toast dismiss `X` button | Top-right toast |
| `gems-outage-topup-wallet` | Outage banner `Top up wallet` link | Visible only when bot is offline |
| `gems-outage-signin-for-dm` | Outage banner `Sign in to get DM` button | Logged-out path |
| `gems-outage-notify-me` | Outage banner `DM me when back` button | Logged-in path; can be `disabled` while submitting |
| `gems-amount-preset-{value}` | Quick-select preset chips | One per `PRESET_AMOUNTS` value (`10`, `25`, `50`, `100`) |
| `gems-amount-stepper-down` | `−` stepper button | Disabled at `amount <= 1` |
| `gems-amount-input` | Custom amount text input | `inputmode="numeric"` |
| `gems-amount-stepper-up` | `+` stepper button | Disabled at `amount >= maxAmount` |
| `gems-listing-card` | Listing tile wrapper `<div>` | Carries `data-ph-listing-id`, `data-ph-listing-type` |
| `gems-listing-card-cta` | Per-listing select button | Carries `data-ph-listing-id`, `data-ph-listing-type`; disabled when out of stock or out of range |
| `gems-buy-button` | Main `Finish Purchase` CTA | **Top rage-click hypothesis.** Disabled when `selectedStockK < amount`. Also includes `aria-disabled` for explicit signaling. |
| `gems-buy-button-mobile-sticky` | Reserved for a future mobile sticky CTA | Listed for forward-compat |
| `gems-login-cta` | `Login to Buy` button shown to logged-out users | Always enabled |
| `gems-wallet-add-funds` | Wallet bar `Add Funds` link | Logged-in only |
| `gems-confirm-modal-close` | Modal `X` button | Top-right |
| `gems-confirm-modal-terms-checkbox` | Terms agree checkbox | |
| `gems-terms-link` | `all sales are final` link | Opens `/terms` |
| `gems-help-link` | `Open a ticket in our Discord` link | Opens Discord invite |
| `gems-confirm-modal-add-funds` | `Add Funds` button shown when balance is insufficient | |
| `gems-confirm-modal-cancel` | Modal `Cancel` button | |
| `gems-confirm-modal-confirm` | Modal `Confirm Purchase` button | Disabled until terms checked or while submitting |

Reserved/not yet wired (no current UI, but in the registry for forward-compat): `gems-currency-toggle`, `gems-payment-method-toggle`, `gems-faq-toggle`, `gems-vendor-link`.

## Event payloads

### `gems_element_clicked`
Fires on every click on any element with a `data-ph-id` ancestor. Volume is high; PostHog handles it.

```ts
{
  element_id: string,            // the data-ph-id of the closest tagged ancestor
  auth_state: 'logged_in' | 'logged_out',
  is_disabled: boolean,          // disabled attr OR aria-disabled="true" OR class includes 'opacity-50' (visually-disabled)
  current_amount: number,        // discountedPrice in USD at click time
  current_gems_qty: number,      // amount in thousands (k)
  current_listing_id: string | null,    // from data-ph-listing-id on the clicked card if present, else selectedListing.id
  current_listing_type: string | null,  // 'platform' | 'vendor' | null
  device_type: 'Desktop' | 'Mobile' | 'Tablet',
  viewport_width: number | null,
  time_since_page_load_ms: number | null,
}
```

### `gems_disabled_button_clicked`
Fires only when the clicked element resolves as disabled (any of: native `disabled`, `aria-disabled="true"`, or `opacity-50` class — the visual-disabled style used throughout this page). Same payload as `gems_element_clicked`.

This is the primary rage-click hypothesis: users mash `Finish Purchase` while it's visually grayed out (insufficient stock / unmet preconditions) and nothing visible happens, so they keep clicking.

### `$rageclick` enrichment
PostHog autocapture already fires `$rageclick`. The provider's `before_send` hook + a global capture-phase click listener stamp `target_element_id` onto the event so we can group rage-clicks by `data-ph-id` directly.

## Session recording

- Always recording on `/gems` (rage-click hot zone — overrides the sample rate).
- Other paths recorded at sample rate from `NEXT_PUBLIC_POSTHOG_RECORDING_SAMPLE_RATE` (default `1.0`).
- `maskAllInputs: true` and `collectFonts: true` carried forward from previous config.
- Recording is started/stopped from the `loaded` callback, so the decision is taken once after init.

## HogQL templates for the next analytics run

### Which elements rage-clicks land on (top of mind)
```sql
SELECT properties.target_element_id, count() AS rage_clicks
FROM events
WHERE event = '$rageclick'
  AND properties.$pathname = '/gems'
  AND timestamp >= now() - interval 7 day
GROUP BY properties.target_element_id
ORDER BY rage_clicks DESC
```

### Which elements were clicked while disabled (rage-click root cause)
```sql
SELECT properties.element_id, properties.is_disabled, count() AS clicks
FROM events
WHERE event = 'gems_disabled_button_clicked'
  AND timestamp >= now() - interval 7 day
GROUP BY properties.element_id, properties.is_disabled
ORDER BY clicks DESC
```

### Cross-group: clicks by element + auth state + disabled flag
```sql
SELECT properties.element_id,
       properties.auth_state,
       properties.is_disabled,
       count() AS clicks,
       countIf(event = '$rageclick') AS rage_clicks
FROM events
WHERE event IN ('gems_element_clicked', '$rageclick')
  AND properties.$pathname = '/gems'
  AND timestamp >= now() - interval 7 day
GROUP BY properties.element_id, properties.auth_state, properties.is_disabled
ORDER BY rage_clicks DESC, clicks DESC
```

### Time-since-load distribution for rage-clicks (early frustration vs late)
```sql
SELECT
  CASE
    WHEN properties.time_since_page_load_ms < 5000 THEN '0-5s'
    WHEN properties.time_since_page_load_ms < 15000 THEN '5-15s'
    WHEN properties.time_since_page_load_ms < 60000 THEN '15-60s'
    ELSE '60s+'
  END AS bucket,
  count() AS clicks
FROM events
WHERE event = 'gems_element_clicked'
  AND properties.$pathname = '/gems'
  AND timestamp >= now() - interval 7 day
GROUP BY bucket
ORDER BY bucket
```

## How to verify locally

1. `npm run dev`
2. Open `http://localhost:3000/gems` with the PostHog Toolbar enabled (`?__posthog=true` if needed).
3. Open DevTools → Network → filter `posthog`.
4. Click around (preset chips, +/− steppers, custom input, listing cards, the buy button while logged out).
5. For each click, confirm a `gems_element_clicked` POST with the right `element_id` is sent.
6. Click `Finish Purchase` while no listing has stock for your amount — the button should be visually disabled and the click should fire `gems_disabled_button_clicked` (in addition to `gems_element_clicked`).
7. Mash any element 4+ times within ~1s — PostHog autocapture should fire `$rageclick`; verify its payload includes `target_element_id` set to your `data-ph-id`.
8. In PostHog: confirm a session recording exists for the `/gems` visit even if your overall sample rate is < 1.
