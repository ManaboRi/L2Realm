-- AlterTable
ALTER TABLE "Guide" ADD COLUMN "race" TEXT;
ALTER TABLE "Guide" ADD COLUMN "repeatable" BOOLEAN NOT NULL DEFAULT false;
