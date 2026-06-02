CREATE TABLE "OpeningClick" (
  "id" TEXT NOT NULL,
  "serverId" TEXT NOT NULL,
  "instanceId" TEXT NOT NULL DEFAULT '',
  "ipHash" TEXT NOT NULL,
  "userAgent" TEXT,
  "referer" TEXT,
  "targetUrl" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'coming-soon',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "OpeningClick_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OpeningClick_serverId_instanceId_createdAt_idx" ON "OpeningClick"("serverId", "instanceId", "createdAt");
CREATE INDEX "OpeningClick_createdAt_idx" ON "OpeningClick"("createdAt");
CREATE INDEX "OpeningClick_ipHash_createdAt_idx" ON "OpeningClick"("ipHash", "createdAt");

ALTER TABLE "OpeningClick"
ADD CONSTRAINT "OpeningClick_serverId_fkey"
FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE;
