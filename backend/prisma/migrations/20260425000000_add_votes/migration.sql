-- AlterTable
ALTER TABLE "Server" ADD COLUMN IF NOT EXISTS "monthlyVotes" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Vote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Vote_serverId_userId_createdAt_idx" ON "Vote"("serverId", "userId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Vote_serverId_ip_createdAt_idx" ON "Vote"("serverId", "ip", "createdAt");

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable (weeklyVotes)
ALTER TABLE "Server" ADD COLUMN IF NOT EXISTS "weeklyVotes" INTEGER NOT NULL DEFAULT 0;
