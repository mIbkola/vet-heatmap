-- CreateTable
CREATE TABLE "federal_districts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "regions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "isoCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "federalDistrictId" TEXT NOT NULL,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "zoom" INTEGER NOT NULL DEFAULT 7,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "regions_federalDistrictId_fkey" FOREIGN KEY ("federalDistrictId") REFERENCES "federal_districts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "diseases" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '',
    "isParticularly" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "threats" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "legacyId" INTEGER NOT NULL,
    "diseaseId" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "threatLevel" TEXT NOT NULL,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "radius" REAL NOT NULL,
    "description" TEXT NOT NULL,
    "affectedAnimals" TEXT NOT NULL,
    "season" TEXT NOT NULL,
    "lastUpdate" TEXT NOT NULL,
    "isRealData" BOOLEAN NOT NULL DEFAULT false,
    "outbreakStatus" TEXT,
    "preventionSteps" TEXT NOT NULL,
    "sources" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "threats_diseaseId_fkey" FOREIGN KEY ("diseaseId") REFERENCES "diseases" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "threats_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "regions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "data_sources" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "threatId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL DEFAULT '',
    "date" TEXT NOT NULL DEFAULT '',
    "type" TEXT NOT NULL DEFAULT 'official',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "data_sources_threatId_fkey" FOREIGN KEY ("threatId") REFERENCES "threats" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "recommendations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "threatId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "priority" TEXT NOT NULL DEFAULT 'planned',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "recommendations_threatId_fkey" FOREIGN KEY ("threatId") REFERENCES "threats" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "vaccines" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "threatId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "manufacturer" TEXT NOT NULL DEFAULT '',
    "schedule" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "vaccines_threatId_fkey" FOREIGN KEY ("threatId") REFERENCES "threats" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "federal_districts_code_key" ON "federal_districts"("code");

-- CreateIndex
CREATE UNIQUE INDEX "regions_isoCode_key" ON "regions"("isoCode");

-- CreateIndex
CREATE UNIQUE INDEX "diseases_name_key" ON "diseases"("name");

-- CreateIndex
CREATE UNIQUE INDEX "threats_legacyId_key" ON "threats"("legacyId");
