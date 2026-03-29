-- CreateEnum
CREATE TYPE "VendorPayoutStatus" AS ENUM ('pending', 'completed', 'rejected');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('deposit', 'purchase', 'vendor_earning', 'vendor_payout', 'refund');

-- AlterTable
ALTER TABLE "Deposit" ADD COLUMN     "chargeAmount" DECIMAL(12,2),
ADD COLUMN     "processingFee" DECIMAL(12,2);

-- CreateTable
CREATE TABLE "VendorPayout" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "status" "VendorPayoutStatus" NOT NULL DEFAULT 'pending',
    "adminNotes" TEXT,
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL,
    "completedAt" TEXT,

    CONSTRAINT "VendorPayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionLedger" (
    "id" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT NOT NULL,
    "relatedId" TEXT,
    "createdAt" TEXT NOT NULL,

    CONSTRAINT "TransactionLedger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VendorPayout_vendorId_idx" ON "VendorPayout"("vendorId");

-- CreateIndex
CREATE INDEX "VendorPayout_status_idx" ON "VendorPayout"("status");

-- CreateIndex
CREATE INDEX "TransactionLedger_userId_idx" ON "TransactionLedger"("userId");

-- CreateIndex
CREATE INDEX "TransactionLedger_type_idx" ON "TransactionLedger"("type");

-- CreateIndex
CREATE INDEX "TransactionLedger_createdAt_idx" ON "TransactionLedger"("createdAt");

-- AddForeignKey
ALTER TABLE "VendorPayout" ADD CONSTRAINT "VendorPayout_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
