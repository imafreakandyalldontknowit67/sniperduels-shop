-- DropIndex
DROP INDEX IF EXISTS "User_discordId_idx";

-- CreateIndex
DROP INDEX IF EXISTS "User_discordId_key";
CREATE UNIQUE INDEX "User_discordId_key" ON "User"("discordId");
