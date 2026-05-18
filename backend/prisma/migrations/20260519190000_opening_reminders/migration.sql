CREATE TABLE "OpeningReminder" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "serverId" TEXT NOT NULL,
  "instanceId" TEXT NOT NULL DEFAULT '',
  "openingAt" TIMESTAMP(3) NOT NULL,
  "notifyAt" TIMESTAMP(3) NOT NULL,
  "notifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "OpeningReminder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OpeningReminder_userId_serverId_instanceId_key" ON "OpeningReminder"("userId", "serverId", "instanceId");
CREATE INDEX "OpeningReminder_userId_notifyAt_idx" ON "OpeningReminder"("userId", "notifyAt");
CREATE INDEX "OpeningReminder_notifyAt_notifiedAt_idx" ON "OpeningReminder"("notifyAt", "notifiedAt");

ALTER TABLE "OpeningReminder"
  ADD CONSTRAINT "OpeningReminder_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OpeningReminder"
  ADD CONSTRAINT "OpeningReminder_serverId_fkey"
  FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE;
