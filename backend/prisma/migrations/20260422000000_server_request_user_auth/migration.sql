-- ServerRequest: привязать к User + добавить openedDate, убрать лишние поля
ALTER TABLE "ServerRequest"
  ADD COLUMN IF NOT EXISTS "userId" TEXT,
  ADD COLUMN IF NOT EXISTS "openedDate" TIMESTAMP(3);

-- Удалим устаревшие поля (icon/description/plan/email) — теперь админ вносит детали сам
ALTER TABLE "ServerRequest" DROP COLUMN IF EXISTS "icon";
ALTER TABLE "ServerRequest" DROP COLUMN IF EXISTS "description";
ALTER TABLE "ServerRequest" DROP COLUMN IF EXISTS "plan";
ALTER TABLE "ServerRequest" DROP COLUMN IF EXISTS "email";

-- FK на User (SET NULL при удалении пользователя)
ALTER TABLE "ServerRequest"
  ADD CONSTRAINT "ServerRequest_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "ServerRequest_userId_createdAt_idx"
  ON "ServerRequest"("userId", "createdAt");
