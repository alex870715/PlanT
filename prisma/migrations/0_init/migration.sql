-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Trip" (
    "id" TEXT NOT NULL,
    "seedCode" CHAR(6) NOT NULL,
    "title" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TWD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchRoom" (
    "id" TEXT NOT NULL,
    "roomCode" CHAR(6) NOT NULL,
    "destinationSlug" TEXT NOT NULL,
    "destinationLabel" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "hostName" TEXT NOT NULL DEFAULT '探索隊長',
    "votingEndsAt" TIMESTAMP(3),
    "plantedSeedCode" CHAR(6),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchVote" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "voterName" TEXT NOT NULL,
    "vote" CHAR(4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripTask" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'booking',
    "assignee" TEXT,
    "amount" DECIMAL(12,2),
    "notes" TEXT,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TripTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripTaskAttachment" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TripTaskAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripTaskConfirmation" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "memberName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TripTaskConfirmation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripExpense" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TWD',
    "exchangeRate" DECIMAL(16,6) NOT NULL DEFAULT 1,
    "paidByMemberId" TEXT NOT NULL,
    "splitMemberIds" JSONB NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TripExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripSettlement" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "fromMemberId" TEXT NOT NULL,
    "toMemberId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TripSettlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Spot" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "memberId" TEXT,
    "name" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "openHours" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "travelMode" TEXT,
    "travelMinutes" INTEGER,
    "isTrunk" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Spot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Trip_seedCode_key" ON "Trip"("seedCode");

-- CreateIndex
CREATE UNIQUE INDEX "MatchRoom_roomCode_key" ON "MatchRoom"("roomCode");

-- CreateIndex
CREATE INDEX "MatchVote_roomId_idx" ON "MatchVote"("roomId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchVote_roomId_cardId_voterName_key" ON "MatchVote"("roomId", "cardId", "voterName");

-- CreateIndex
CREATE INDEX "TripTask_tripId_idx" ON "TripTask"("tripId");

-- CreateIndex
CREATE INDEX "TripTaskAttachment_taskId_idx" ON "TripTaskAttachment"("taskId");

-- CreateIndex
CREATE INDEX "TripTaskConfirmation_taskId_idx" ON "TripTaskConfirmation"("taskId");

-- CreateIndex
CREATE UNIQUE INDEX "TripTaskConfirmation_taskId_memberId_key" ON "TripTaskConfirmation"("taskId", "memberId");

-- CreateIndex
CREATE INDEX "TripExpense_tripId_idx" ON "TripExpense"("tripId");

-- CreateIndex
CREATE INDEX "TripExpense_paidByMemberId_idx" ON "TripExpense"("paidByMemberId");

-- CreateIndex
CREATE INDEX "TripSettlement_tripId_idx" ON "TripSettlement"("tripId");

-- CreateIndex
CREATE UNIQUE INDEX "TripSettlement_tripId_fromMemberId_toMemberId_key" ON "TripSettlement"("tripId", "fromMemberId", "toMemberId");

-- CreateIndex
CREATE INDEX "Spot_tripId_idx" ON "Spot"("tripId");

-- CreateIndex
CREATE INDEX "Spot_memberId_idx" ON "Spot"("memberId");

-- CreateIndex
CREATE INDEX "Member_tripId_idx" ON "Member"("tripId");

-- AddForeignKey
ALTER TABLE "MatchVote" ADD CONSTRAINT "MatchVote_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "MatchRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripTask" ADD CONSTRAINT "TripTask_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripTaskAttachment" ADD CONSTRAINT "TripTaskAttachment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "TripTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripTaskConfirmation" ADD CONSTRAINT "TripTaskConfirmation_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "TripTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripExpense" ADD CONSTRAINT "TripExpense_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripExpense" ADD CONSTRAINT "TripExpense_paidByMemberId_fkey" FOREIGN KEY ("paidByMemberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripSettlement" ADD CONSTRAINT "TripSettlement_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Spot" ADD CONSTRAINT "Spot_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Spot" ADD CONSTRAINT "Spot_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

