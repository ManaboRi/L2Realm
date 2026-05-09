ALTER TABLE "Server"
ADD COLUMN "totalVotes" INTEGER NOT NULL DEFAULT 0;

UPDATE "Server" s
SET "totalVotes" = COALESCE(v.count, 0)
FROM (
  SELECT "serverId", COUNT(*)::INTEGER AS count
  FROM "Vote"
  GROUP BY "serverId"
) v
WHERE s.id = v."serverId";

ALTER TABLE "Vote"
ALTER COLUMN "userId" DROP NOT NULL;

ALTER TABLE "Vote"
ADD COLUMN "nickname" TEXT NOT NULL DEFAULT '';

ALTER TABLE "Vote" DROP CONSTRAINT IF EXISTS "Vote_userId_fkey";

ALTER TABLE "Vote"
ADD CONSTRAINT "Vote_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Vote_serverId_nickname_createdAt_idx" ON "Vote"("serverId", "nickname", "createdAt");
