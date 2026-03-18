-- CreateEnum
CREATE TYPE "VendorDepositStatus" AS ENUM ('pending', 'queued', 'completed', 'failed');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "vendorListingId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isVendor" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "VendorGemListing" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "pricePerK" DECIMAL(12,2) NOT NULL,
    "minOrderK" INTEGER NOT NULL DEFAULT 1,
    "maxOrderK" INTEGER NOT NULL DEFAULT 500,
    "stockK" INTEGER NOT NULL DEFAULT 0,
    "bulkTiers" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL,

    CONSTRAINT "VendorGemListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorDeposit" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "amountK" INTEGER NOT NULL,
    "status" "VendorDepositStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL,

    CONSTRAINT "VendorDeposit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorEarning" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "saleAmount" DECIMAL(12,2) NOT NULL,
    "platformFee" DECIMAL(12,2) NOT NULL,
    "netAmount" DECIMAL(12,2) NOT NULL,
    "createdAt" TEXT NOT NULL,

    CONSTRAINT "VendorEarning_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VendorGemListing_active_idx" ON "VendorGemListing"("active");

-- CreateIndex
CREATE UNIQUE INDEX "VendorGemListing_vendorId_key" ON "VendorGemListing"("vendorId");

-- CreateIndex
CREATE INDEX "VendorDeposit_vendorId_idx" ON "VendorDeposit"("vendorId");

-- CreateIndex
CREATE INDEX "VendorDeposit_status_idx" ON "VendorDeposit"("status");

-- CreateIndex
CREATE INDEX "VendorEarning_vendorId_idx" ON "VendorEarning"("vendorId");

-- CreateIndex
CREATE INDEX "VendorEarning_orderId_idx" ON "VendorEarning"("orderId");

-- AddForeignKey
ALTER TABLE "VendorGemListing" ADD CONSTRAINT "VendorGemListing_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorDeposit" ADD CONSTRAINT "VendorDeposit_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorEarning" ADD CONSTRAINT "VendorEarning_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
