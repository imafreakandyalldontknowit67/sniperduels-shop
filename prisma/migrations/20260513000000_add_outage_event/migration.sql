-- CreateTable
CREATE TABLE "OutageEvent" (
    "id" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "reason" TEXT NOT NULL,
    "durationSeconds" INTEGER,

    CONSTRAINT "OutageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OutageEvent_startedAt_idx" ON "OutageEvent"("startedAt");
