-- AlterTable
ALTER TABLE "User" ADD COLUMN "avatar" TEXT,
                   ADD COLUMN "vkId"   TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_vkId_key" ON "User"("vkId");
