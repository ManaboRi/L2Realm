CREATE TABLE "OpeningWait" (
  "id" TEXT NOT NULL,
  "serverId" TEXT NOT NULL,
  "instanceId" TEXT NOT NULL DEFAULT '',
  "ipHash" TEXT NOT NULL,
  "weekKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "OpeningWait_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OpeningWait_serverId_instanceId_ipHash_weekKey_key" ON "OpeningWait"("serverId", "instanceId", "ipHash", "weekKey");
CREATE INDEX "OpeningWait_serverId_instanceId_weekKey_idx" ON "OpeningWait"("serverId", "instanceId", "weekKey");
CREATE INDEX "OpeningWait_weekKey_createdAt_idx" ON "OpeningWait"("weekKey", "createdAt");
CREATE INDEX "OpeningWait_ipHash_weekKey_idx" ON "OpeningWait"("ipHash", "weekKey");

ALTER TABLE "OpeningWait"
  ADD CONSTRAINT "OpeningWait_serverId_fkey"
  FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE;
