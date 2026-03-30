-- DropIndex
DROP INDEX IF EXISTS "VendorEarning_orderId_idx";

-- CreateIndex
CREATE UNIQUE INDEX "VendorEarning_orderId_key" ON "VendorEarning"("orderId");
