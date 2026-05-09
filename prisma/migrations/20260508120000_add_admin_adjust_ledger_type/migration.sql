-- Add admin_adjust to TransactionType enum so admin balance changes are auditable.
ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'admin_adjust';
