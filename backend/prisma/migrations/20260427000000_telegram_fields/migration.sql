-- Поля для автопостинга в Telegram-канал
ALTER TABLE "Server" ADD COLUMN IF NOT EXISTS "serverOfDay" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Server" ADD COLUMN IF NOT EXISTS "notifiedOpening" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "Server_serverOfDay_idx" ON "Server"("serverOfDay");
CREATE INDEX IF NOT EXISTS "Server_notifiedOpening_idx" ON "Server"("notifiedOpening");
