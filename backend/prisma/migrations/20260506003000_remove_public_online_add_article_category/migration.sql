ALTER TABLE "Server" DROP COLUMN IF EXISTS "online";
ALTER TABLE "Server" DROP COLUMN IF EXISTS "onlineSourceUrl";
ALTER TABLE "Server" DROP COLUMN IF EXISTS "onlineSourcePattern";
ALTER TABLE "Server" DROP COLUMN IF EXISTS "onlineSourceStatus";
ALTER TABLE "Server" DROP COLUMN IF EXISTS "onlineUpdatedAt";
ALTER TABLE "Server" DROP COLUMN IF EXISTS "onlineCheckedAt";

ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'Новости';
CREATE INDEX IF NOT EXISTS "Article_category_idx" ON "Article"("category");
