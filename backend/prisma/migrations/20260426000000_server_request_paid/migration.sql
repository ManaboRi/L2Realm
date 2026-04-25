-- Поля для платного размещения «Скоро открытие»
ALTER TABLE "ServerRequest" ADD COLUMN IF NOT EXISTS "contact" TEXT;
ALTER TABLE "ServerRequest" ADD COLUMN IF NOT EXISTS "paid" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ServerRequest" ADD COLUMN IF NOT EXISTS "paymentId" TEXT;
ALTER TABLE "ServerRequest" ADD COLUMN IF NOT EXISTS "ip" TEXT;

CREATE INDEX IF NOT EXISTS "ServerRequest_paid_idx" ON "ServerRequest"("paid");
CREATE INDEX IF NOT EXISTS "ServerRequest_paymentId_idx" ON "ServerRequest"("paymentId");
