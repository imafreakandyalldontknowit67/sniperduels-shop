# Tests

Run with `npm test` (one-shot) or `npm run test:watch`.

## Setup

Tests need a separate Postgres database. They auto-skip if `TEST_DATABASE_URL` isn't set, so CI green != tests ran.

```bash
# 1. Create a test DB (one time)
createdb sniper_duels_test

# 2. Apply all migrations including the wallet trigger
DATABASE_URL=postgresql://user:pw@localhost:5432/sniper_duels_test \
  npx prisma migrate deploy

# 3. Add to .env.local
TEST_DATABASE_URL="postgresql://user:pw@localhost:5432/sniper_duels_test"
```

## What's tested

`storage.wallet.test.ts` covers the wallet+ledger contract that broke before:

- `addToWallet` credits wallet AND writes a ledger row, atomically
- `deductFromWallet` rejects insufficient balance (no DB change, no ledger row)
- `admin_adjust` ledger amounts are SIGNED (negative on remove)
- `createAdminInitiatedPayout` insufficient → no payout, no ledger, wallet unchanged
- `createAdminInitiatedPayout` happy path → wallet decremented, payout row, ledger row
- **The trigger**: raw `UPDATE User SET walletBalance = X` without permission token is rejected
- **The bypass**: same UPDATE inside a TX with `SET LOCAL app.allow_wallet_change='true'` succeeds

Test users have synthetic IDs (`test_alice`, `test_bob`) so they won't collide with real data.
