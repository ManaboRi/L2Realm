-- Картинка-обложка для статьи блога (опционально)
ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "image" TEXT;
