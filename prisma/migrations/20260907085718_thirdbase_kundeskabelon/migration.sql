-- CreateTable
CREATE TABLE "ClientProject" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "kundeNavn" TEXT NOT NULL,
    "cvr" TEXT,
    "kontaktpersonNavn" TEXT,
    "kontaktpersonTitel" TEXT,
    "kontaktpersonMail" TEXT,
    "kontaktpersonTelefon" TEXT,
    "deltagere" TEXT,
    "projektstart" TEXT,
    "forventetAfslutning" TEXT,
    "nuvaerendeBase" TEXT NOT NULL DEFAULT '1',
    "samletStatus" TEXT NOT NULL DEFAULT 'Ikke startet',
    "kadence" TEXT,
    "hubspotPortal" TEXT,
    "projektmappe" TEXT,
    "formaal" TEXT,
    "udgangspunktKanaler" TEXT,
    "udgangspunktLeadsPrMaaned" TEXT,
    "udgangspunktSalgsproces" TEXT,
    "udgangspunktCrmModenhed" TEXT,
    "udgangspunktAutomatisering" TEXT,
    "udgangspunktHvorTabes" TEXT,
    "vigtigsteFund" TEXT,
    "customerId" TEXT,
    "projektansvarligId" TEXT,
    "opretterId" TEXT,

    CONSTRAINT "ClientProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectBase" (
    "id" TEXT NOT NULL,
    "nummer" INTEGER NOT NULL,
    "navn" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Ikke startet',
    "ansvarlig" TEXT,
    "startdato" TEXT,
    "maaldato" TEXT,
    "godkendtDato" TEXT,
    "godkendtAfId" TEXT,
    "godkendtAfNavn" TEXT,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "ProjectBase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BaseStep" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "titel" TEXT NOT NULL,
    "beskrivelse" TEXT NOT NULL DEFAULT '',
    "aktiviteter" TEXT,
    "ejer" TEXT,
    "deadline" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Ikke startet',
    "position" INTEGER NOT NULL DEFAULT 0,
    "baseId" TEXT NOT NULL,

    CONSTRAINT "BaseStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistItem" (
    "id" TEXT NOT NULL,
    "tekst" TEXT NOT NULL,
    "afkrydset" BOOLEAN NOT NULL DEFAULT false,
    "afkrydsetDato" TIMESTAMP(3),
    "afkrydsetAfId" TEXT,
    "afkrydsetAfNavn" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "baseId" TEXT NOT NULL,

    CONSTRAINT "ChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kpi" (
    "id" TEXT NOT NULL,
    "navn" TEXT NOT NULL,
    "beskrivelse" TEXT NOT NULL DEFAULT '',
    "baseline" TEXT,
    "maal" TEXT,
    "aktuel" TEXT,
    "maaledato" TEXT,
    "kilde" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "baseId" TEXT NOT NULL,

    CONSTRAINT "Kpi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscoveryActivity" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "aktivitet" TEXT NOT NULL,
    "ejer" TEXT,
    "deadline" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Ikke startet',
    "noter" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "DiscoveryActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingChannel" (
    "id" TEXT NOT NULL,
    "kanal" TEXT NOT NULL,
    "aktiv" BOOLEAN NOT NULL DEFAULT false,
    "budget" TEXT,
    "landingsside" TEXT,
    "sporingSatOp" BOOLEAN NOT NULL DEFAULT false,
    "ansvarlig" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "baseId" TEXT NOT NULL,

    CONSTRAINT "MarketingChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PipelineStage" (
    "id" TEXT NOT NULL,
    "trin" INTEGER NOT NULL,
    "fase" TEXT NOT NULL,
    "kriterie" TEXT,
    "ejer" TEXT,
    "automatisering" TEXT,
    "baseId" TEXT NOT NULL,

    CONSTRAINT "PipelineStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadScoringRule" (
    "id" TEXT NOT NULL,
    "kriterie" TEXT NOT NULL DEFAULT '',
    "type" TEXT NOT NULL,
    "point" TEXT,
    "note" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "baseId" TEXT NOT NULL,

    CONSTRAINT "LeadScoringRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Automation" (
    "id" TEXT NOT NULL,
    "navn" TEXT NOT NULL DEFAULT '',
    "trigger" TEXT,
    "handling" TEXT,
    "vaerktoej" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Ikke startet',
    "ejer" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "baseId" TEXT NOT NULL,

    CONSTRAINT "Automation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OwnershipArea" (
    "id" TEXT NOT NULL,
    "omraade" TEXT NOT NULL,
    "ejerHosKunden" TEXT,
    "ejerHosThirdbase" TEXT,
    "gennemgang" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "OwnershipArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangeLogEntry" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "dato" TEXT,
    "hvadBlevAendret" TEXT NOT NULL DEFAULT '',
    "hvorfor" TEXT,
    "aendretAf" TEXT,
    "resultat" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "ChangeLogEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceReview" (
    "id" TEXT NOT NULL,
    "dato" TEXT,
    "deltagere" TEXT,
    "vigtigsteFund" TEXT,
    "besluttedeOptimeringer" TEXT,
    "naesteReview" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "PerformanceReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectRisk" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "beskrivelse" TEXT NOT NULL DEFAULT '',
    "base" TEXT,
    "konsekvens" TEXT,
    "haandtering" TEXT,
    "ejer" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Åben',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "ProjectRisk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectDecision" (
    "id" TEXT NOT NULL,
    "dato" TEXT,
    "beslutning" TEXT NOT NULL DEFAULT '',
    "baggrund" TEXT,
    "besluttetAf" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "ProjectDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatusMeeting" (
    "id" TEXT NOT NULL,
    "dato" TEXT,
    "deltagere" TEXT,
    "nuvaerendeBase" TEXT,
    "sidenSidst" TEXT,
    "kpiBevaegelse" TEXT,
    "blokeringer" TEXT,
    "beslutninger" TEXT,
    "naesteMoede" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "StatusMeeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatusMeetingAction" (
    "id" TEXT NOT NULL,
    "opgave" TEXT NOT NULL DEFAULT '',
    "ejer" TEXT,
    "deadline" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "meetingId" TEXT NOT NULL,

    CONSTRAINT "StatusMeetingAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClientProject_customerId_idx" ON "ClientProject"("customerId");

-- CreateIndex
CREATE INDEX "ClientProject_projektansvarligId_idx" ON "ClientProject"("projektansvarligId");

-- CreateIndex
CREATE INDEX "ProjectBase_projectId_idx" ON "ProjectBase"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectBase_projectId_nummer_key" ON "ProjectBase"("projectId", "nummer");

-- CreateIndex
CREATE INDEX "BaseStep_baseId_idx" ON "BaseStep"("baseId");

-- CreateIndex
CREATE INDEX "ChecklistItem_baseId_idx" ON "ChecklistItem"("baseId");

-- CreateIndex
CREATE INDEX "Kpi_baseId_idx" ON "Kpi"("baseId");

-- CreateIndex
CREATE INDEX "DiscoveryActivity_projectId_idx" ON "DiscoveryActivity"("projectId");

-- CreateIndex
CREATE INDEX "MarketingChannel_baseId_idx" ON "MarketingChannel"("baseId");

-- CreateIndex
CREATE INDEX "PipelineStage_baseId_idx" ON "PipelineStage"("baseId");

-- CreateIndex
CREATE INDEX "LeadScoringRule_baseId_idx" ON "LeadScoringRule"("baseId");

-- CreateIndex
CREATE INDEX "Automation_baseId_idx" ON "Automation"("baseId");

-- CreateIndex
CREATE INDEX "OwnershipArea_projectId_idx" ON "OwnershipArea"("projectId");

-- CreateIndex
CREATE INDEX "ChangeLogEntry_projectId_idx" ON "ChangeLogEntry"("projectId");

-- CreateIndex
CREATE INDEX "PerformanceReview_projectId_idx" ON "PerformanceReview"("projectId");

-- CreateIndex
CREATE INDEX "ProjectRisk_projectId_idx" ON "ProjectRisk"("projectId");

-- CreateIndex
CREATE INDEX "ProjectDecision_projectId_idx" ON "ProjectDecision"("projectId");

-- CreateIndex
CREATE INDEX "StatusMeeting_projectId_idx" ON "StatusMeeting"("projectId");

-- CreateIndex
CREATE INDEX "StatusMeetingAction_meetingId_idx" ON "StatusMeetingAction"("meetingId");

-- AddForeignKey
ALTER TABLE "ClientProject" ADD CONSTRAINT "ClientProject_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientProject" ADD CONSTRAINT "ClientProject_projektansvarligId_fkey" FOREIGN KEY ("projektansvarligId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectBase" ADD CONSTRAINT "ProjectBase_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ClientProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectBase" ADD CONSTRAINT "ProjectBase_godkendtAfId_fkey" FOREIGN KEY ("godkendtAfId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BaseStep" ADD CONSTRAINT "BaseStep_baseId_fkey" FOREIGN KEY ("baseId") REFERENCES "ProjectBase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_baseId_fkey" FOREIGN KEY ("baseId") REFERENCES "ProjectBase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_afkrydsetAfId_fkey" FOREIGN KEY ("afkrydsetAfId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kpi" ADD CONSTRAINT "Kpi_baseId_fkey" FOREIGN KEY ("baseId") REFERENCES "ProjectBase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscoveryActivity" ADD CONSTRAINT "DiscoveryActivity_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ClientProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingChannel" ADD CONSTRAINT "MarketingChannel_baseId_fkey" FOREIGN KEY ("baseId") REFERENCES "ProjectBase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PipelineStage" ADD CONSTRAINT "PipelineStage_baseId_fkey" FOREIGN KEY ("baseId") REFERENCES "ProjectBase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadScoringRule" ADD CONSTRAINT "LeadScoringRule_baseId_fkey" FOREIGN KEY ("baseId") REFERENCES "ProjectBase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Automation" ADD CONSTRAINT "Automation_baseId_fkey" FOREIGN KEY ("baseId") REFERENCES "ProjectBase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnershipArea" ADD CONSTRAINT "OwnershipArea_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ClientProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeLogEntry" ADD CONSTRAINT "ChangeLogEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ClientProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceReview" ADD CONSTRAINT "PerformanceReview_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ClientProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectRisk" ADD CONSTRAINT "ProjectRisk_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ClientProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDecision" ADD CONSTRAINT "ProjectDecision_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ClientProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusMeeting" ADD CONSTRAINT "StatusMeeting_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ClientProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusMeetingAction" ADD CONSTRAINT "StatusMeetingAction_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "StatusMeeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
