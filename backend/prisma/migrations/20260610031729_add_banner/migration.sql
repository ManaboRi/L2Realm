-- DropIndex
DROP INDEX "server_instances_gin";

-- CreateTable
CREATE TABLE "Banner" (
    "id" TEXT NOT NULL,
    "slot" INTEGER NOT NULL DEFAULT 1,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "image" TEXT,
    "href" TEXT NOT NULL,
    "advertiser" TEXT,
    "erid" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "endDate" TIMESTAMP(3),
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Banner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Banner_active_slot_idx" ON "Banner"("active", "slot");
