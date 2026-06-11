-- Теги-типы квестов (Сюжетный, Клановые, Повторяемые, ...)
ALTER TABLE "Guide" ADD COLUMN "types" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
