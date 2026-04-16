-- AlterTable
ALTER TABLE "User" ADD COLUMN     "registrationIp" TEXT,
ADD COLUMN     "resetToken" TEXT,
ADD COLUMN     "resetTokenExpires" TIMESTAMP(3);
