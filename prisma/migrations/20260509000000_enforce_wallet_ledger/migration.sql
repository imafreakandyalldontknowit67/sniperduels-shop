-- Enforce that every change to User.walletBalance is paired with a TransactionLedger
-- row in the same Postgres transaction. The bypass is granted by SET LOCAL inside
-- the wallet-mutating transaction (see lib/storage.ts addToWallet/deductFromWallet/
-- updateWalletBalance/createVendorPayout/rejectVendorPayout/createAdminInitiatedPayout).
--
-- Why: prior to this trigger, the admin balance route mutated walletBalance via raw
-- prisma.user.update without writing TransactionLedger, which made past admin removes
-- unrecoverable after container redeploys. This trigger makes the failure mode loud
-- (exception at COMMIT) instead of silent (data loss).

CREATE OR REPLACE FUNCTION enforce_wallet_ledger() RETURNS TRIGGER AS $$
DECLARE
  allowed text;
BEGIN
  -- No-op updates pass through (Prisma sometimes issues UPDATE ... SET walletBalance = walletBalance)
  IF NEW."walletBalance" IS NOT DISTINCT FROM OLD."walletBalance" THEN
    RETURN NEW;
  END IF;

  -- current_setting(name, missing_ok) returns '' (not NULL) when missing in PG 15+
  allowed := current_setting('app.allow_wallet_change', true);
  IF allowed IS NULL OR allowed = '' OR allowed != 'true' THEN
    RAISE EXCEPTION
      'Refused walletBalance change for user % from % to %: app.allow_wallet_change session var not set. Wrap your update in a transaction that also inserts a TransactionLedger row, then SET LOCAL app.allow_wallet_change = ''true'' before the UPDATE.',
      NEW.id, OLD."walletBalance", NEW."walletBalance"
      USING HINT = 'See lib/storage.ts addToWallet/deductFromWallet for the correct pattern.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_wallet_ledger_trg ON "User";
CREATE TRIGGER enforce_wallet_ledger_trg
  BEFORE UPDATE OF "walletBalance" ON "User"
  FOR EACH ROW
  EXECUTE FUNCTION enforce_wallet_ledger();
