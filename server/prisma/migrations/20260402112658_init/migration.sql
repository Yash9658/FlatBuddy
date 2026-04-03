-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('NOT_REQUESTED', 'PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Group" ADD COLUMN     "planningNotes" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isSuspended" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "landlordVerificationDocumentUrl" TEXT,
ADD COLUMN     "landlordVerificationNotes" TEXT,
ADD COLUMN     "landlordVerificationRequestedAt" TIMESTAMP(3),
ADD COLUMN     "landlordVerificationStatus" "VerificationStatus" NOT NULL DEFAULT 'NOT_REQUESTED',
ADD COLUMN     "landlordVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "suspendedAt" TIMESTAMP(3),
ADD COLUMN     "suspensionReason" TEXT;

-- CreateTable
CREATE TABLE "GroupShortlistedProperty" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "addedByUserId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupShortlistedProperty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationRead" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "notificationKey" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationRead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GroupShortlistedProperty_groupId_propertyId_key" ON "GroupShortlistedProperty"("groupId", "propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationRead_userId_notificationKey_key" ON "NotificationRead"("userId", "notificationKey");

-- AddForeignKey
ALTER TABLE "GroupShortlistedProperty" ADD CONSTRAINT "GroupShortlistedProperty_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupShortlistedProperty" ADD CONSTRAINT "GroupShortlistedProperty_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupShortlistedProperty" ADD CONSTRAINT "GroupShortlistedProperty_addedByUserId_fkey" FOREIGN KEY ("addedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationRead" ADD CONSTRAINT "NotificationRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
