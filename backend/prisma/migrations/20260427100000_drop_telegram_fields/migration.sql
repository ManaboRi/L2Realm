-- Откат полей автопоста в Telegram (фича удалена — постим вручную).
-- Indexes дропаются автоматически при удалении колонок.
ALTER TABLE "Server" DROP COLUMN IF EXISTS "serverOfDay";
ALTER TABLE "Server" DROP COLUMN IF EXISTS "notifiedOpening";
