-- Phase 4 task 4.1: link Orders to item-marketplace listings.
-- Nullable, no backfill needed.
ALTER TABLE "Order" ADD COLUMN "vaultListingId" TEXT;
CREATE INDEX "Order_vaultListingId_idx" ON "Order"("vaultListingId");
