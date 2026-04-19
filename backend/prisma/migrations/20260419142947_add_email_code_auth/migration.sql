-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailCode" TEXT,
ADD COLUMN     "emailCodeExpires" TIMESTAMP(3),
ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "password" DROP NOT NULL;
