# Payment instrumentation reference

Complete catalog of every PostHog event emitted along the deposit lifecycle, the
property contract for each, and what data the providers (Pandabase / Stripe,
NowPayments, NearPayments) actually expose vs. what we infer.

> Server-side events are captured via `captureServerEvent()` in
> `lib/posthog-api.ts`. Client-side events use `posthog-js`. **Webhook events
> are authoritative** — the client's onPaymentSuccess / verify-poll captures are
> intentionally renamed `deposit_completed_client` so they don't double-count
> the canonical webhook-fired `deposit_completed`.

> **PII guardrails**: We never log PANs, CVCs, full crypto private keys, or full
> wallet addresses. Pay-to addresses are truncated to the last 6 chars
> (`address_suffix`). Decline codes, brands, and 2-letter country codes are safe
> and intentional.

## Event matrix

| Event                       | Where fires                                 | Provider(s)                       | Source       |
| --------------------------- | ------------------------------------------- | --------------------------------- | ------------ |
| `deposit_initiated`         | `/api/deposits/create` + client deposit page | pandabase, nowpayments            | server + client |
| `deposit_method_selected`   | Pandabase modal `onPaymentMethodSelected`   | pandabase                         | client       |
| `deposit_method_changed`    | Pandabase modal `onPaymentMethodChanged`    | pandabase                         | client       |
| `crypto_address_generated`  | `/api/deposits/create-crypto`               | nowpayments                       | server + client |
| `checkout_modal_opened`     | client deposit page (Pandabase modal open)  | pandabase                         | client       |
| `deposit_checkout_closed`   | Pandabase modal `onClose`                   | pandabase                         | client       |
| `deposit_completed`         | `/api/webhooks/{pandabase,nowpayments,nearpayments}` | all                       | server (webhook) |
| `deposit_completed_client`  | client deposit page success/verify-poll     | all                               | client (hint) |
| `deposit_failed`            | `/api/webhooks/{pandabase,nowpayments,nearpayments}` + client | all              | server + client |
| `crypto_payment_received`   | crypto webhook (status finished/confirmed)  | nowpayments, nearpayments         | server       |
| `crypto_payment_underpaid`  | crypto webhook (status partially_paid)      | nowpayments, nearpayments         | server       |
| `crypto_payment_expired`    | crypto webhook (status expired) + client poll | nowpayments, nearpayments       | server + client |
| `crypto_payment_failed`     | crypto webhook (status failed/refunded)     | nowpayments, nearpayments         | server       |

## Property contract

### `deposit_initiated`

Fires once when a user clicks "Continue to Payment" / "Deposit with BTC". Both
client and server emit this — the server copy guarantees we don't lose it to
ad-blockers; the client copy gives us tax_region and other UI-only context.

```json
{
  "provider": "pandabase",                    // pandabase | nowpayments | nearpayments
  "method": "pending",                        // pending (card-pre-pick) | crypto
  "final_method": "crypto_btc",               // only set for crypto on initiate
  "currency": "USD",                          // user's local currency (USD/EUR/GBP/...)
  "pay_currency": "btc",                      // crypto only — NowPayments id
  "amount_usd": 25.00,
  "local_amount": 22.50,
  "local_currency": "EUR",
  "fx_rate": 0.9,
  "processing_fee": 2.10,                     // card only
  "charge_amount": 27.10,                     // card only
  "intent_id": "dep_abc123",                  // = our deposit row id
  "deposit_id": "dep_abc123",
  "invoice_id": "cs_xxxxxx",                  // pandabase sessionId, card only
  "ref_id": "A4F2B8",                         // pandabase line-item ref, card only
  "payment_id": "5234123412",                 // crypto only — NowPayments id
  "tax_region": "CA",                         // card only, optional
  "attempt_number": 2,                        // # of deposits in last 30min including this one
  "is_retry": true,                           // any failed/expired deposit in last 30min?
  "source": "server"                          // server | client
}
```

### `deposit_method_selected`

Fires when the user picks a method on the Pandabase modal. **Note**: depends on
the Pandabase JS SDK exposing `onPaymentMethodSelected` — it's documented in
their callbacks but if they ship a build without it, this event simply won't
fire and we'll have to lean on `deposit_completed.final_method` instead. Test
before merging.

```json
{
  "provider": "pandabase",
  "method": "apple_pay",                      // apple_pay | google_pay | card | cashapp | ideal | alipay | ...
  "card_brand": "visa",                       // optional, only when card chosen
  "amount_usd": 25.00,
  "intent_id": "dep_abc123",
  "deposit_id": "dep_abc123"
}
```

### `deposit_method_changed`

```json
{
  "provider": "pandabase",
  "from_method": "card",
  "to_method": "apple_pay",
  "amount_usd": 25.00,
  "intent_id": "dep_abc123",
  "deposit_id": "dep_abc123"
}
```

### `crypto_address_generated`

Fires when NowPayments returns a pay address. Server-side has the full
`payment_id` and `expected_amount`; the client copy gives us "user saw the QR".

```json
{
  "provider": "nowpayments",
  "currency": "btc",
  "pay_currency": "btc",
  "final_method": "crypto_btc",
  "address_suffix": "k4hQz9",                 // last 6 chars only (PII guard)
  "expected_amount": 0.00041532,
  "amount_usd": 25.00,
  "local_amount": 22.50,
  "local_currency": "EUR",
  "fx_rate": 0.9,
  "intent_id": "dep_abc123",
  "deposit_id": "dep_abc123",
  "payment_id": "5234123412",
  "attempt_number": 1,
  "is_retry": false,
  "source": "server"                          // or "client"
}
```

### `deposit_completed` (canonical, server-side)

Captured by the relevant webhook handler. **This is the event the analytics run
should use** for success-rate splits — the client hint event is
`deposit_completed_client`.

```json
{
  "provider": "pandabase",
  "method": "apple_pay",                      // resolved on completion
  "final_method": "apple_pay",                // canonical key for funnels
  "card_brand": "visa",
  "card_country": "US",                       // 2-letter ISO from BIN
  "card_funding": "credit",                   // credit | debit | prepaid
  "is_3ds": true,
  "intent_id": "dep_abc123",
  "charge_id": "ch_xxx",
  "invoice_id": "cs_xxx",
  "ref_id": "A4F2B8",
  "deposit_id": "dep_abc123",
  "amount": 25.00,
  "amount_usd": 25.00,
  "charge_amount": 27.10,
  "currency": "EUR",
  "local_amount": 22.50,
  "fx_rate": 0.9,
  "processing_time_ms": 4321                  // initiated → completed
}
```

For **crypto** completions:

```json
{
  "provider": "nowpayments",
  "method": "crypto",
  "final_method": "crypto_btc",
  "currency": "btc",
  "pay_currency": "btc",
  "payment_status": "finished",
  "amount_received": 0.00041530,              // actually_paid in crypto
  "actually_paid": 0.00041530,
  "outcome_amount": 24.85,                    // USD net after NowPayments swap
  "outcome_currency": "USD",
  "payment_id": "5234123412",
  "intent_id": "dep_abc123",
  "deposit_id": "dep_abc123",
  "tx_hash": "0xabcd...",
  "amount_usd": 25.00,
  "processing_time_ms": 92140
}
```

### `deposit_failed` (canonical, server-side)

```json
{
  "provider": "pandabase",
  "payment_method_type": "card",              // card | apple_pay | google_pay | crypto | unknown
  "method": "card",
  "decline_code": "insufficient_funds",       // Stripe decline_code or "expired" / "failed" / "refunded" for crypto
  "error_code": "card_declined",              // Stripe error.code
  "error_message": "Your card has insufficient funds.", // truncated to 300 chars, no PII
  "card_brand": "visa",
  "card_country": "US",
  "card_funding": "debit",
  "is_3ds": false,
  "intent_id": "dep_abc123",
  "charge_id": "ch_xxx",
  "invoice_id": "cs_xxx",
  "deposit_id": "dep_abc123",
  "amount": 25.00,
  "amount_usd": 25.00,
  "currency": "USD",
  "source": "webhook"                         // webhook | client
}
```

### `crypto_payment_received` / `crypto_payment_underpaid` / `crypto_payment_expired` / `crypto_payment_failed`

Granular crypto-only events for the four NowPayments terminal states. Same
shape — they differ only in name and `payment_status`. Example
`crypto_payment_underpaid`:

```json
{
  "provider": "nowpayments",
  "currency": "eth",
  "pay_currency": "eth",
  "final_method": "crypto_eth",
  "method": "crypto",
  "payment_status": "partially_paid",
  "actually_paid": 0.0095,
  "pay_amount_expected": 0.0102,
  "ratio": 0.9314,
  "payment_id": "5234123412",
  "intent_id": "dep_abc123",
  "deposit_id": "dep_abc123",
  "tx_hash": "0xabcd...",
  "price_amount": 25.00,
  "amount_usd": 25.00
}
```

## What providers actually expose

### Pandabase (Stripe wrapper)

Pandabase webhook payloads wrap Stripe's PaymentIntent/Charge under
`payload.data.charge.payment_method_details`. Our extractor in
`lib/posthog-api.ts:extractPandabasePaymentInfo` walks several path candidates
because Pandabase has occasionally renamed fields between events:

- **Available**: `payment_method_details.type` (card / apple_pay / google_pay / cashapp /
  ideal / sepa_debit / alipay / wechat_pay / etc), `card.brand`, `card.country`,
  `card.funding` (credit/debit/prepaid), `card.wallet.type`, `last_payment_error.decline_code`,
  `last_payment_error.code`, `last_payment_error.message`, `payment_intent`/`charge.id`,
  `card.three_d_secure.authentication_flow`.
- **Aspirational / NOT confirmed**: `onPaymentMethodSelected` and
  `onPaymentMethodChanged` callbacks on the Pandabase JS modal SDK. These exist
  in some Stripe modal wrappers but I haven't verified Pandabase ships them in
  the build we load. If they don't fire, `deposit_method_selected` will simply
  be silent — `deposit_completed.final_method` will still cover the analysis.
- **Not exposed**: Last 4 of card (we don't want this), CVC, full PAN,
  cardholder name. None of these go to PostHog regardless.

### NowPayments / NearPayments

The IPN payload exposes:

- **Available**: `payment_status` (waiting/confirming/confirmed/finished/partially_paid/failed/expired/refunded),
  `pay_currency`, `pay_amount`, `actually_paid`, `outcome_amount`, `outcome_currency`,
  `price_amount`, `price_currency`, `payment_id`, `order_id`. Some IPNs
  include a `payin_hash` / `tx_id` (we harvest both).
- **Aspirational**: `confirmations` count — exposed in NowPayments REST API
  (`GET /payment/{id}`) but not always in IPN. If we want it, fetch it from
  `getPaymentStatus` after the IPN fires.
- **Not exposed**: User wallet address (other than what we generated for
  receiving). On-chain confirmations require an explicit poll.

## Edge cases to test before merging

1. **Pandabase `onPaymentMethodSelected` callback** — verify it fires when the
   user picks Apple Pay vs Card on the embedded modal. If it doesn't fire,
   `deposit_method_selected` will be missing but the data is still recoverable
   via `deposit_completed.final_method` from the webhook.
2. **Apple Pay sheet dismissal** — when the user taps "Cancel" on the native
   Apple Pay sheet, Pandabase emits `onClose` (we capture
   `deposit_checkout_closed`) but no failure webhook fires. The webhook funnel
   will see this as a stranded `deposit_initiated` with no terminal event.
   That's expected — analytics should treat checkout_closed as the terminal
   "abandon" signal.
3. **Crypto under-payment ratio ≥ 0.98** — we credit the full amount. The
   `crypto_payment_underpaid` event still fires with the actual ratio, **followed
   by** a `crypto_payment_received` + `deposit_completed`. Funnels filtering on
   `payment_status: "partially_paid"` won't see this as terminal failure.
4. **Manual verify-poll path** (user clicks "Verify" on a pending deposit) —
   fires `deposit_completed_client` with `source: "manual_verify"`. The webhook
   may or may not have arrived; the canonical `deposit_completed` is webhook-only.
5. **Honeypot trip** — when the bot fills the hidden `website` field, we return
   a fake `dep_<timestamp>` deposit ID without writing to DB. The client will
   still emit `deposit_initiated`. Filter these in PostHog with
   `intent_id starts with "dep_" AND ends with all digits` (the real ID format
   uses cuid).
6. **Pandabase `dispute` and `refund` events** are NOT instrumented as new
   PostHog events in this PR — they go through `notifyDispute` / `notifyRefund`
   to Discord and trigger a blacklist. Adding `deposit_disputed` /
   `deposit_refunded` would be a future enhancement.
7. **NearPayments** uses the same NowPayments webhook signature and payload
   shape, so the same extractor and event set works. `provider` is the only
   key difference (`nearpayments` vs `nowpayments`).
8. **Server-side capture queue** — `captureServerEvent` is fire-and-forget with
   a swallowed catch. PostHog's `/capture` endpoint is durable but it's worth
   verifying the events actually land in PostHog after a webhook test.
