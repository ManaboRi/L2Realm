-- Rework monetization: SubscriptionPlan → FREE|VIP only, add Boost table.

-- 1) Переводим все STANDARD/PREMIUM подписки в FREE (сохраняем сервер в списке)
UPDATE "Subscription" SET "plan" = 'FREE' WHERE "plan"::text IN ('STANDARD', 'PREMIUM');

-- 2) Пересоздаём enum без STANDARD/PREMIUM
ALTER TYPE "SubscriptionPlan" RENAME TO "SubscriptionPlan_old";
CREATE TYPE "SubscriptionPlan" AS ENUM ('FREE', 'VIP');

ALTER TABLE "Subscription" ALTER COLUMN "plan" DROP DEFAULT;
ALTER TABLE "Subscription"
    ALTER COLUMN "plan" TYPE "SubscriptionPlan"
    USING "plan"::text::"SubscriptionPlan";
ALTER TABLE "Subscription" ALTER COLUMN "plan" SET DEFAULT 'FREE';

DROP TYPE "SubscriptionPlan_old";

-- 3) Сбрасываем флаг vip у серверов, где это было по STANDARD/PREMIUM (на случай мусора)
UPDATE "Server" s
SET "vip" = false
WHERE s."vip" = true
  AND NOT EXISTS (
      SELECT 1 FROM "Subscription" sub
      WHERE sub."serverId" = s."id" AND sub."plan" = 'VIP'
  );

-- 4) CreateTable: Boost
CREATE TABLE "Boost" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3) NOT NULL,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "paymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Boost_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Boost_serverId_endDate_idx" ON "Boost"("serverId", "endDate");
CREATE INDEX "Boost_endDate_idx" ON "Boost"("endDate");

ALTER TABLE "Boost" ADD CONSTRAINT "Boost_serverId_fkey"
    FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE;
