-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "browser" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "device" TEXT,
ADD COLUMN     "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "os" TEXT,
ALTER COLUMN "ipAddress" SET DATA TYPE TEXT;

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");
