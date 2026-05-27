ALTER TABLE "Server"
  ADD COLUMN "trafficMonthly" INTEGER,
  ADD COLUMN "trafficThreeMonths" INTEGER,
  ADD COLUMN "trafficPeriod" TEXT,
  ADD COLUMN "trafficSource" TEXT,
  ADD COLUMN "trafficHistory" JSONB NOT NULL DEFAULT '[]';
