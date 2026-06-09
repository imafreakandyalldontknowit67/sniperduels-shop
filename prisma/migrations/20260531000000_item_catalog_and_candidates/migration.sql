-- Phase 2: Item marketplace foundation — catalog + auto-indexing.
-- Adds two tables (ItemCatalog, CatalogCandidate) plus four enums.
-- Non-breaking: no existing rows are touched. Safe to apply in prod.

-- CreateEnum
CREATE TYPE "ItemCatalogSource" AS ENUM ('manual', 'sniperduelsvalues', 'bot_observed', 'sweep');

-- CreateEnum
CREATE TYPE "ItemCatalogType" AS ENUM ('sniper', 'knife');

-- CreateEnum
CREATE TYPE "CatalogCandidateStatus" AS ENUM ('pending', 'approved', 'rejected', 'duplicate');

-- CreateTable
CREATE TABLE "ItemCatalog" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "weapon" TEXT NOT NULL,
    "skin" TEXT NOT NULL,
    "type" "ItemCatalogType" NOT NULL,
    "crate" TEXT,
    "slug" TEXT,
    "source" "ItemCatalogSource" NOT NULL DEFAULT 'manual',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogCandidate" (
    "id" TEXT NOT NULL,
    "ocrName" TEXT NOT NULL,
    "weapon" TEXT,
    "skin" TEXT,
    "rarity" TEXT,
    "condition" TEXT,
    "fragtrakr" BOOLEAN NOT NULL DEFAULT false,
    "fx" TEXT,
    "crate" TEXT,
    "observedCount" INTEGER NOT NULL DEFAULT 1,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "screenshotUrl" TEXT,
    "status" "CatalogCandidateStatus" NOT NULL DEFAULT 'pending',
    "approvedAsId" TEXT,
    "notes" TEXT,

    CONSTRAINT "CatalogCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ItemCatalog_name_key" ON "ItemCatalog"("name");
CREATE INDEX "ItemCatalog_weapon_idx" ON "ItemCatalog"("weapon");
CREATE INDEX "ItemCatalog_type_active_idx" ON "ItemCatalog"("type", "active");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogCandidate_ocrName_key" ON "CatalogCandidate"("ocrName");
CREATE INDEX "CatalogCandidate_status_lastSeenAt_idx" ON "CatalogCandidate"("status", "lastSeenAt");
CREATE INDEX "CatalogCandidate_weapon_skin_idx" ON "CatalogCandidate"("weapon", "skin");

-- AddForeignKey
ALTER TABLE "CatalogCandidate"
  ADD CONSTRAINT "CatalogCandidate_approvedAsId_fkey"
  FOREIGN KEY ("approvedAsId") REFERENCES "ItemCatalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;
