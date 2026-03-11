-- CreateEnum
CREATE TYPE "Discipline" AS ENUM ('OT', 'PT', 'SLP', 'MSW', 'COTA', 'PTA');

-- CreateEnum
CREATE TYPE "ClinicianStatus" AS ENUM ('ONBOARDING', 'CREDENTIALING', 'ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('NEW', 'MATCHING', 'OFFER_SENT', 'ASSIGNED', 'VISIT_COMPLETED', 'DOCUMENTATION_RECEIVED', 'READY_FOR_BILLING', 'CLOSED', 'CANCELLED', 'UNFILLED');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('PENDING', 'SENT', 'YES_RECEIVED', 'NO_RECEIVED', 'WON', 'LOST_FILLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "MessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hashedPassword" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'scheduler',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agencies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinicians" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "discipline" "Discipline" NOT NULL,
    "status" "ClinicianStatus" NOT NULL DEFAULT 'ONBOARDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinicians_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zip_coverages" (
    "id" TEXT NOT NULL,
    "clinicianId" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,

    CONSTRAINT "zip_coverages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credentials" (
    "id" TEXT NOT NULL,
    "clinicianId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" TEXT NOT NULL,
    "patientName" TEXT NOT NULL,
    "patientPhone" TEXT,
    "patientAddress" TEXT,
    "patientCity" TEXT,
    "patientState" TEXT,
    "patientZipCode" TEXT NOT NULL,
    "discipline" "Discipline" NOT NULL,
    "status" "ReferralStatus" NOT NULL DEFAULT 'NEW',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "notes" TEXT,
    "agencyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "broadcast_offers" (
    "id" TEXT NOT NULL,
    "referralId" TEXT NOT NULL,
    "clinicianId" TEXT NOT NULL,
    "status" "OfferStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "twilioSid" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "broadcast_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignments" (
    "id" TEXT NOT NULL,
    "referralId" TEXT NOT NULL,
    "clinicianId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communication_logs" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "direction" "MessageDirection" NOT NULL,
    "twilioSid" TEXT,
    "referralId" TEXT,
    "clinicianId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "communication_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "clinicians_email_key" ON "clinicians"("email");

-- CreateIndex
CREATE UNIQUE INDEX "clinicians_phone_key" ON "clinicians"("phone");

-- CreateIndex
CREATE INDEX "zip_coverages_zipCode_idx" ON "zip_coverages"("zipCode");

-- CreateIndex
CREATE UNIQUE INDEX "zip_coverages_clinicianId_zipCode_key" ON "zip_coverages"("clinicianId", "zipCode");

-- CreateIndex
CREATE INDEX "referrals_status_idx" ON "referrals"("status");

-- CreateIndex
CREATE INDEX "referrals_patientZipCode_idx" ON "referrals"("patientZipCode");

-- CreateIndex
CREATE INDEX "referrals_discipline_idx" ON "referrals"("discipline");

-- CreateIndex
CREATE INDEX "broadcast_offers_referralId_idx" ON "broadcast_offers"("referralId");

-- CreateIndex
CREATE INDEX "broadcast_offers_clinicianId_idx" ON "broadcast_offers"("clinicianId");

-- CreateIndex
CREATE INDEX "broadcast_offers_status_idx" ON "broadcast_offers"("status");

-- CreateIndex
CREATE UNIQUE INDEX "broadcast_offers_referralId_clinicianId_key" ON "broadcast_offers"("referralId", "clinicianId");

-- CreateIndex
CREATE UNIQUE INDEX "assignments_referralId_key" ON "assignments"("referralId");

-- CreateIndex
CREATE INDEX "communication_logs_phone_idx" ON "communication_logs"("phone");

-- CreateIndex
CREATE INDEX "communication_logs_referralId_idx" ON "communication_logs"("referralId");

-- CreateIndex
CREATE INDEX "communication_logs_clinicianId_idx" ON "communication_logs"("clinicianId");

-- AddForeignKey
ALTER TABLE "zip_coverages" ADD CONSTRAINT "zip_coverages_clinicianId_fkey" FOREIGN KEY ("clinicianId") REFERENCES "clinicians"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_clinicianId_fkey" FOREIGN KEY ("clinicianId") REFERENCES "clinicians"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broadcast_offers" ADD CONSTRAINT "broadcast_offers_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "referrals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broadcast_offers" ADD CONSTRAINT "broadcast_offers_clinicianId_fkey" FOREIGN KEY ("clinicianId") REFERENCES "clinicians"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "referrals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_clinicianId_fkey" FOREIGN KEY ("clinicianId") REFERENCES "clinicians"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
