-- Phase 11 task 11.6: audit trail for VaultItem status transitions.
CREATE TABLE "ItemStateLog" (
    "id" TEXT NOT NULL,
    "vaultItemId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "reason" TEXT,
    "triggeredBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ItemStateLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ItemStateLog_vaultItemId_createdAt_idx" ON "ItemStateLog"("vaultItemId", "createdAt");
CREATE INDEX "ItemStateLog_createdAt_idx" ON "ItemStateLog"("createdAt");
