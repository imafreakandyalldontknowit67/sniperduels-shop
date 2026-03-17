-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "skippedAt" TEXT;

-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN     "depositsDisabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Blacklist" (
    "id" TEXT NOT NULL,
    "ip" TEXT,
    "userId" TEXT,
    "reason" TEXT NOT NULL,
    "endpoint" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Blacklist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Blacklist_ip_idx" ON "Blacklist"("ip");

-- CreateIndex
CREATE INDEX "Blacklist_userId_idx" ON "Blacklist"("userId");
