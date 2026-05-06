-- AlterTable: add outage recovery DM opt-in fields to User
ALTER TABLE "User" ADD COLUMN "notifyOnBotRecovery" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "lastRecoveryDmSentAt" TIMESTAMP(3);

-- AlterTable: extend OAuthState to carry intent through OAuth round-trip
ALTER TABLE "OAuthState" ADD COLUMN "reason" TEXT;
ALTER TABLE "OAuthState" ADD COLUMN "intentId" TEXT;

-- CreateTable: PendingBuyIntent
CREATE TABLE "PendingBuyIntent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "listingId" TEXT NOT NULL,
    "amountK" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    CONSTRAINT "PendingBuyIntent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PendingBuyIntent_userId_consumedAt_idx" ON "PendingBuyIntent"("userId", "consumedAt");
CREATE INDEX "PendingBuyIntent_expiresAt_idx" ON "PendingBuyIntent"("expiresAt");

-- AddForeignKey: PendingBuyIntent.userId → User.id (nullable, ON DELETE SET NULL)
ALTER TABLE "PendingBuyIntent" ADD CONSTRAINT "PendingBuyIntent_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
