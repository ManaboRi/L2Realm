-- AlterTable: добавляем счётчик голосов за текущую неделю
ALTER TABLE "Server" ADD COLUMN IF NOT EXISTS "weeklyVotes" INTEGER NOT NULL DEFAULT 0;
