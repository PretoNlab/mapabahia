-- CreateTable
CREATE TABLE "Municipality" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "nameNormalized" TEXT NOT NULL,
    "ibgeCode" TEXT,
    "tseCode" TEXT,
    "uf" TEXT NOT NULL DEFAULT 'BA',
    "geoJson" TEXT,
    "latitude" REAL,
    "longitude" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ElectionDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "rawText" TEXT,
    "municipalityId" TEXT,
    "year" INTEGER NOT NULL,
    "round" INTEGER NOT NULL DEFAULT 1,
    "uf" TEXT NOT NULL DEFAULT 'BA',
    "pageCount" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT,
    "processedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "ingestionJobId" TEXT,
    CONSTRAINT "ElectionDocument_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "Municipality" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ElectionDocument_ingestionJobId_fkey" FOREIGN KEY ("ingestionJobId") REFERENCES "IngestionJob" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ElectionResultSummary" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "municipalityId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "round" INTEGER NOT NULL DEFAULT 1,
    "totalSections" INTEGER,
    "eligibleVoters" INTEGER,
    "turnout" INTEGER,
    "turnoutPercentage" REAL,
    "abstention" INTEGER,
    "abstentionPercentage" REAL,
    "totalVotesMayor" INTEGER,
    "validVotesMayor" INTEGER,
    "validVotesMayorPercentage" REAL,
    "nullVotesMayor" INTEGER,
    "nullVotesMayorPercentage" REAL,
    "blankVotesMayor" INTEGER,
    "blankVotesMayorPercentage" REAL,
    "totalVotesCouncil" INTEGER,
    "validVotesCouncil" INTEGER,
    "validVotesCouncilPercentage" REAL,
    "nominalVotesCouncil" INTEGER,
    "legendVotesCouncil" INTEGER,
    "nullVotesCouncil" INTEGER,
    "nullVotesCouncilPercentage" REAL,
    "blankVotesCouncil" INTEGER,
    "blankVotesCouncilPercentage" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ElectionResultSummary_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ElectionDocument" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ElectionResultSummary_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "Municipality" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CandidateResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "municipalityId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "round" INTEGER NOT NULL DEFAULT 1,
    "candidateNumber" TEXT NOT NULL,
    "candidateName" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "party" TEXT,
    "coalition" TEXT,
    "votes" INTEGER,
    "votePercentage" REAL,
    "status" TEXT,
    "voteDestination" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CandidateResult_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ElectionDocument" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CandidateResult_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "Municipality" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SourceChunk" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "pageNumber" INTEGER,
    "chunkIndex" INTEGER NOT NULL,
    "embedding" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SourceChunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ElectionDocument" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IngestionJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "totalFiles" INTEGER NOT NULL DEFAULT 0,
    "processed" INTEGER NOT NULL DEFAULT 0,
    "succeeded" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "sourcePath" TEXT NOT NULL,
    "errorLog" TEXT,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Municipality_ibgeCode_key" ON "Municipality"("ibgeCode");

-- CreateIndex
CREATE INDEX "Municipality_name_idx" ON "Municipality"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Municipality_nameNormalized_uf_key" ON "Municipality"("nameNormalized", "uf");

-- CreateIndex
CREATE INDEX "ElectionDocument_municipalityId_idx" ON "ElectionDocument"("municipalityId");

-- CreateIndex
CREATE INDEX "ElectionDocument_status_idx" ON "ElectionDocument"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ElectionDocument_fileName_key" ON "ElectionDocument"("fileName");

-- CreateIndex
CREATE UNIQUE INDEX "ElectionResultSummary_documentId_key" ON "ElectionResultSummary"("documentId");

-- CreateIndex
CREATE INDEX "ElectionResultSummary_municipalityId_idx" ON "ElectionResultSummary"("municipalityId");

-- CreateIndex
CREATE INDEX "ElectionResultSummary_year_round_idx" ON "ElectionResultSummary"("year", "round");

-- CreateIndex
CREATE INDEX "CandidateResult_municipalityId_idx" ON "CandidateResult"("municipalityId");

-- CreateIndex
CREATE INDEX "CandidateResult_party_idx" ON "CandidateResult"("party");

-- CreateIndex
CREATE INDEX "CandidateResult_candidateName_idx" ON "CandidateResult"("candidateName");

-- CreateIndex
CREATE INDEX "CandidateResult_status_idx" ON "CandidateResult"("status");

-- CreateIndex
CREATE INDEX "SourceChunk_documentId_idx" ON "SourceChunk"("documentId");
