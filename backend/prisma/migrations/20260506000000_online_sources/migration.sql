ALTER TABLE "Server"
  ADD COLUMN "onlineSourceUrl" TEXT,
  ADD COLUMN "onlineSourceStatus" TEXT NOT NULL DEFAULT 'disabled',
  ADD COLUMN "onlineUpdatedAt" TIMESTAMP(3);
