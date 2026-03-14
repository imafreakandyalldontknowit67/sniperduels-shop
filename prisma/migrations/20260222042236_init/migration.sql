-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('gems', 'item', 'crate');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded');

-- CreateEnum
CREATE TYPE "DepositStatus" AS ENUM ('pending', 'completed', 'failed', 'expired');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "avatar" TEXT,
    "robloxCreatedAt" TEXT,
    "discordId" TEXT,
    "discordUsername" TEXT,
    "discordAvatar" TEXT,
    "discordLinkedAt" TEXT,
    "walletBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "lifetimeSpend" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discordFirstPurchaseUsed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TEXT NOT NULL,
    "lastLogin" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "type" "OrderType" NOT NULL,
    "itemName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "pricePerUnit" DECIMAL(12,2) NOT NULL,
    "totalPrice" DECIMAL(12,2) NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'pending',
    "playerReady" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL,
    "completedAt" TEXT,
    "notes" TEXT,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deposit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "DepositStatus" NOT NULL DEFAULT 'pending',
    "pandabaseInvoiceId" TEXT NOT NULL,
    "pandabaseCheckoutUrl" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL,
    "completedAt" TEXT,

    CONSTRAINT "Deposit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockItem" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "type" TEXT NOT NULL,
    "description" VARCHAR(2000),
    "priceUsd" DECIMAL(12,2) NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "imageUrl" TEXT,
    "rarity" TEXT,
    "fx" TEXT,
    "fragtrak" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL,

    CONSTRAINT "StockItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GemStock" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "balanceInK" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TEXT NOT NULL,

    CONSTRAINT "GemStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionBlacklist" (
    "jti" TEXT NOT NULL,
    "expiresAt" INTEGER NOT NULL,

    CONSTRAINT "SessionBlacklist_pkey" PRIMARY KEY ("jti")
);

-- CreateIndex
CREATE INDEX "Order_userId_idx" ON "Order"("userId");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Deposit_pandabaseInvoiceId_key" ON "Deposit"("pandabaseInvoiceId");

-- CreateIndex
CREATE INDEX "Deposit_userId_idx" ON "Deposit"("userId");

-- CreateIndex
CREATE INDEX "SessionBlacklist_expiresAt_idx" ON "SessionBlacklist"("expiresAt");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deposit" ADD CONSTRAINT "Deposit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
