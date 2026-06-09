-- Phase 3: Item marketplace runtime — vault, listings, sessions, jobs.
-- Adds 5 tables + 5 enums. Non-breaking; no existing rows touched.

-- CreateEnum
CREATE TYPE "VaultItemStatus" AS ENUM ('deposited', 'listed', 'reserved', 'sold', 'withdrawing', 'withdrawn');
CREATE TYPE "ItemDepositSessionStatus" AS ENUM ('pending', 'bot_in_trade', 'awaiting_confirm', 'completed', 'cancelled', 'expired');
CREATE TYPE "ItemDepositMode" AS ENUM ('auto_detect', 'declared');
CREATE TYPE "ItemDeliveryStatus" AS ENUM ('queued', 'bot_in_trade', 'completed', 'failed');
CREATE TYPE "ItemWithdrawalStatus" AS ENUM ('queued', 'bot_in_trade', 'completed', 'failed');

-- VaultItem
CREATE TABLE "VaultItem" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "catalogId" TEXT NOT NULL,
    "fingerprint" JSONB NOT NULL,
    "status" "VaultItemStatus" NOT NULL DEFAULT 'deposited',
    "depositedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "listedAt" TIMESTAMP(3),
    "soldAt" TIMESTAMP(3),
    "withdrawnAt" TIMESTAMP(3),
    "lastCellHint" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "VaultItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "VaultItem_ownerId_status_idx" ON "VaultItem"("ownerId", "status");
CREATE INDEX "VaultItem_status_depositedAt_idx" ON "VaultItem"("status", "depositedAt");
CREATE INDEX "VaultItem_catalogId_status_idx" ON "VaultItem"("catalogId", "status");

-- VendorItemListing
CREATE TABLE "VendorItemListing" (
    "id" TEXT NOT NULL,
    "vaultItemId" TEXT NOT NULL,
    "priceUsd" DECIMAL(12,2) NOT NULL,
    "minOfferUsd" DECIMAL(12,2),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "VendorItemListing_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "VendorItemListing_vaultItemId_key" ON "VendorItemListing"("vaultItemId");
CREATE INDEX "VendorItemListing_active_priceUsd_idx" ON "VendorItemListing"("active", "priceUsd");
CREATE INDEX "VendorItemListing_active_createdAt_idx" ON "VendorItemListing"("active", "createdAt");

-- ItemDepositSession
CREATE TABLE "ItemDepositSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mode" "ItemDepositMode" NOT NULL DEFAULT 'auto_detect',
    "status" "ItemDepositSessionStatus" NOT NULL DEFAULT 'pending',
    "declaredItems" JSONB,
    "detectedItems" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    CONSTRAINT "ItemDepositSession_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ItemDepositSession_userId_status_idx" ON "ItemDepositSession"("userId", "status");
CREATE INDEX "ItemDepositSession_status_expiresAt_idx" ON "ItemDepositSession"("status", "expiresAt");

-- ItemDeliveryJob
CREATE TABLE "ItemDeliveryJob" (
    "id" TEXT NOT NULL,
    "vaultItemId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "buyerUserId" TEXT NOT NULL,
    "buyerRobloxName" TEXT NOT NULL,
    "status" "ItemDeliveryStatus" NOT NULL DEFAULT 'queued',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "expectedFingerprint" JSONB NOT NULL,
    CONSTRAINT "ItemDeliveryJob_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ItemDeliveryJob_vaultItemId_key" ON "ItemDeliveryJob"("vaultItemId");
CREATE UNIQUE INDEX "ItemDeliveryJob_orderId_key" ON "ItemDeliveryJob"("orderId");
CREATE INDEX "ItemDeliveryJob_status_createdAt_idx" ON "ItemDeliveryJob"("status", "createdAt");
CREATE INDEX "ItemDeliveryJob_buyerUserId_idx" ON "ItemDeliveryJob"("buyerUserId");

-- ItemWithdrawalJob
CREATE TABLE "ItemWithdrawalJob" (
    "id" TEXT NOT NULL,
    "vaultItemId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userRobloxName" TEXT NOT NULL,
    "status" "ItemWithdrawalStatus" NOT NULL DEFAULT 'queued',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "ItemWithdrawalJob_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ItemWithdrawalJob_vaultItemId_key" ON "ItemWithdrawalJob"("vaultItemId");
CREATE INDEX "ItemWithdrawalJob_status_createdAt_idx" ON "ItemWithdrawalJob"("status", "createdAt");
CREATE INDEX "ItemWithdrawalJob_userId_idx" ON "ItemWithdrawalJob"("userId");

-- FKs
ALTER TABLE "VaultItem"
  ADD CONSTRAINT "VaultItem_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "VaultItem_catalogId_fkey"
  FOREIGN KEY ("catalogId") REFERENCES "ItemCatalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VendorItemListing"
  ADD CONSTRAINT "VendorItemListing_vaultItemId_fkey"
  FOREIGN KEY ("vaultItemId") REFERENCES "VaultItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ItemDepositSession"
  ADD CONSTRAINT "ItemDepositSession_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ItemDeliveryJob"
  ADD CONSTRAINT "ItemDeliveryJob_vaultItemId_fkey"
  FOREIGN KEY ("vaultItemId") REFERENCES "VaultItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ItemDeliveryJob_buyerUserId_fkey"
  FOREIGN KEY ("buyerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ItemWithdrawalJob"
  ADD CONSTRAINT "ItemWithdrawalJob_vaultItemId_fkey"
  FOREIGN KEY ("vaultItemId") REFERENCES "VaultItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ItemWithdrawalJob_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
