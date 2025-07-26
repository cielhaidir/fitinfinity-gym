-- CreateEnum
CREATE TYPE "AIRequestType" AS ENUM ('BODY_COMPOSITION', 'CALORIE_CALCULATOR', 'GENERAL');

-- CreateTable
CREATE TABLE "AIRateLimit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "requestType" "AIRequestType" NOT NULL,
    "dailyLimit" INTEGER NOT NULL DEFAULT 5,
    "weeklyLimit" INTEGER NOT NULL DEFAULT 20,
    "monthlyLimit" INTEGER NOT NULL DEFAULT 50,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIRateLimit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIRequestLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "requestType" "AIRequestType" NOT NULL,
    "endpoint" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "errorMessage" TEXT,
    "tokenCount" INTEGER,
    "processingTime" INTEGER,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIRequestLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AIRateLimit_userId_requestType_key" ON "AIRateLimit"("userId", "requestType");

-- CreateIndex
CREATE INDEX "AIRateLimit_userId_idx" ON "AIRateLimit"("userId");

-- CreateIndex
CREATE INDEX "AIRateLimit_requestType_idx" ON "AIRateLimit"("requestType");

-- CreateIndex
CREATE INDEX "AIRequestLog_userId_idx" ON "AIRequestLog"("userId");

-- CreateIndex
CREATE INDEX "AIRequestLog_requestType_idx" ON "AIRequestLog"("requestType");

-- CreateIndex
CREATE INDEX "AIRequestLog_createdAt_idx" ON "AIRequestLog"("createdAt");

-- CreateIndex
CREATE INDEX "AIRequestLog_userId_requestType_createdAt_idx" ON "AIRequestLog"("userId", "requestType", "createdAt");

-- AddForeignKey
ALTER TABLE "AIRateLimit" ADD CONSTRAINT "AIRateLimit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "AIRequestLog" ADD CONSTRAINT "AIRequestLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;