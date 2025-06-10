-- CreateEnum
CREATE TYPE "FCMemberStatus" AS ENUM ('new', 'contacted', 'follow_up', 'interested', 'not_interested', 'pending', 'scheduled', 'converted', 'rejected', 'inactive');

-- AlterTable
ALTER TABLE "Employee" ALTER COLUMN "fingerprintId" SET DATA TYPE TEXT;

-- CreateTable
CREATE TABLE "FcMember" (
    "id" TEXT NOT NULL,
    "fc_id" TEXT NOT NULL,
    "member_name" TEXT NOT NULL,
    "member_phone" TEXT NOT NULL,
    "member_email" TEXT NOT NULL,
    "status" "FCMemberStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FcMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Config" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FcMember_fc_id_idx" ON "FcMember"("fc_id");

-- CreateIndex
CREATE UNIQUE INDEX "Config_key_key" ON "Config"("key");

-- CreateIndex
CREATE INDEX "Config_key_idx" ON "Config"("key");

-- CreateIndex
CREATE INDEX "Config_category_idx" ON "Config"("category");

-- AddForeignKey
ALTER TABLE "FcMember" ADD CONSTRAINT "FcMember_fc_id_fkey" FOREIGN KEY ("fc_id") REFERENCES "FC"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
