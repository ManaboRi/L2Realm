ALTER TABLE "Article" ADD COLUMN "serverIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE INDEX "Article_serverIds_idx" ON "Article" USING GIN ("serverIds");
