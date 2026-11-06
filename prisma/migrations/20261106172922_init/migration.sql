-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('SZKIC', 'DO_PRZEGLADU', 'ZATWIERDZONA');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'EDITOR',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EditLock" (
    "resource" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EditLock_pkey" PRIMARY KEY ("resource")
);

-- CreateTable
CREATE TABLE "Substance" (
    "cas" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "ecNumber" TEXT,
    "indexNumber" TEXT,
    "reachNumber" TEXT,
    "molecularFormula" TEXT,
    "molarMass" TEXT,
    "density" DOUBLE PRECISION,
    "isSvhc" BOOLEAN NOT NULL DEFAULT false,
    "sclNotes" TEXT,
    "notes" TEXT,
    "exposureLimits" JSONB,
    "lastVerified" TIMESTAMP(3),
    "sourceRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Substance_pkey" PRIMARY KEY ("cas")
);

-- CreateTable
CREATE TABLE "SubstanceHazard" (
    "id" TEXT NOT NULL,
    "substanceCas" TEXT NOT NULL,
    "hazardClass" TEXT NOT NULL,
    "statement" TEXT,
    "mFactorAcute" DOUBLE PRECISION,
    "mFactorChronic" DOUBLE PRECISION,
    "ateOral" DOUBLE PRECISION,
    "ateDermal" DOUBLE PRECISION,
    "ateInhalDust" DOUBLE PRECISION,
    "ateInhalVapour" DOUBLE PRECISION,
    "sclMin" DOUBLE PRECISION,
    "sclStatement" TEXT,
    "note" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SubstanceHazard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mixture" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "form" TEXT NOT NULL DEFAULT 'POWDER',
    "basisVolumeMl" DOUBLE PRECISION NOT NULL DEFAULT 1000,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mixture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MixturePacket" (
    "id" TEXT NOT NULL,
    "mixtureId" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "name" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MixturePacket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MixtureComponent" (
    "id" TEXT NOT NULL,
    "mixtureId" TEXT NOT NULL,
    "packetId" TEXT NOT NULL,
    "substanceCas" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT 'g',
    "note" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MixtureComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MixtureVariant" (
    "id" TEXT NOT NULL,
    "mixtureId" TEXT NOT NULL,
    "volumeMl" DOUBLE PRECISION NOT NULL,
    "sku" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MixtureVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DilutionStep" (
    "id" TEXT NOT NULL,
    "mixtureId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "waterMl" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "documentId" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DilutionStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductItem" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "otherNames" TEXT,
    "ufi" TEXT,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "status" "DocumentStatus" NOT NULL DEFAULT 'SZKIC',
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revisionDate" TIMESTAMP(3),
    "language" TEXT NOT NULL DEFAULT 'pl',
    "notes" TEXT,
    "supplierId" TEXT,
    "variantId" TEXT,
    "packetId" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Section" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Component" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "substanceCas" TEXT,
    "name" TEXT NOT NULL,
    "casNumber" TEXT,
    "ecNumber" TEXT,
    "indexNumber" TEXT,
    "reachNumber" TEXT,
    "concentration" TEXT,
    "hazardClasses" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "hazardStatements" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sclNotes" TEXT,
    "isSvhc" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Component_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentSnapshot" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "note" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "street" TEXT,
    "postalCode" TEXT,
    "city" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Polska',
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "bdo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SectionTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "section" INTEGER NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SectionTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WasteCode" (
    "code" TEXT NOT NULL,
    "descriptionPl" TEXT NOT NULL,
    "isHazardous" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "WasteCode_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "LegalReference" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "journalRef" TEXT,
    "category" TEXT NOT NULL DEFAULT 'KRAJOWE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastVerified" TIMESTAMP(3),

    CONSTRAINT "LegalReference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "EditLock_userId_idx" ON "EditLock"("userId");

-- CreateIndex
CREATE INDEX "Substance_name_idx" ON "Substance"("name");

-- CreateIndex
CREATE INDEX "SubstanceHazard_substanceCas_idx" ON "SubstanceHazard"("substanceCas");

-- CreateIndex
CREATE UNIQUE INDEX "Mixture_code_key" ON "Mixture"("code");

-- CreateIndex
CREATE UNIQUE INDEX "MixturePacket_mixtureId_label_key" ON "MixturePacket"("mixtureId", "label");

-- CreateIndex
CREATE INDEX "MixtureComponent_mixtureId_idx" ON "MixtureComponent"("mixtureId");

-- CreateIndex
CREATE INDEX "MixtureComponent_packetId_idx" ON "MixtureComponent"("packetId");

-- CreateIndex
CREATE INDEX "MixtureComponent_substanceCas_idx" ON "MixtureComponent"("substanceCas");

-- CreateIndex
CREATE UNIQUE INDEX "MixtureVariant_sku_key" ON "MixtureVariant"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "MixtureVariant_mixtureId_volumeMl_key" ON "MixtureVariant"("mixtureId", "volumeMl");

-- CreateIndex
CREATE UNIQUE INDEX "DilutionStep_documentId_key" ON "DilutionStep"("documentId");

-- CreateIndex
CREATE INDEX "DilutionStep_mixtureId_idx" ON "DilutionStep"("mixtureId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- CreateIndex
CREATE INDEX "ProductItem_variantId_idx" ON "ProductItem"("variantId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductItem_productId_variantId_key" ON "ProductItem"("productId", "variantId");

-- CreateIndex
CREATE INDEX "Document_productName_idx" ON "Document"("productName");

-- CreateIndex
CREATE UNIQUE INDEX "Document_variantId_packetId_key" ON "Document"("variantId", "packetId");

-- CreateIndex
CREATE UNIQUE INDEX "Section_documentId_number_key" ON "Section"("documentId", "number");

-- CreateIndex
CREATE INDEX "Component_documentId_idx" ON "Component"("documentId");

-- CreateIndex
CREATE INDEX "DocumentSnapshot_documentId_idx" ON "DocumentSnapshot"("documentId");

-- CreateIndex
CREATE INDEX "SectionTemplate_section_idx" ON "SectionTemplate"("section");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EditLock" ADD CONSTRAINT "EditLock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubstanceHazard" ADD CONSTRAINT "SubstanceHazard_substanceCas_fkey" FOREIGN KEY ("substanceCas") REFERENCES "Substance"("cas") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MixturePacket" ADD CONSTRAINT "MixturePacket_mixtureId_fkey" FOREIGN KEY ("mixtureId") REFERENCES "Mixture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MixtureComponent" ADD CONSTRAINT "MixtureComponent_mixtureId_fkey" FOREIGN KEY ("mixtureId") REFERENCES "Mixture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MixtureComponent" ADD CONSTRAINT "MixtureComponent_packetId_fkey" FOREIGN KEY ("packetId") REFERENCES "MixturePacket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MixtureComponent" ADD CONSTRAINT "MixtureComponent_substanceCas_fkey" FOREIGN KEY ("substanceCas") REFERENCES "Substance"("cas") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MixtureVariant" ADD CONSTRAINT "MixtureVariant_mixtureId_fkey" FOREIGN KEY ("mixtureId") REFERENCES "Mixture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DilutionStep" ADD CONSTRAINT "DilutionStep_mixtureId_fkey" FOREIGN KEY ("mixtureId") REFERENCES "Mixture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DilutionStep" ADD CONSTRAINT "DilutionStep_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductItem" ADD CONSTRAINT "ProductItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductItem" ADD CONSTRAINT "ProductItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "MixtureVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "MixtureVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_packetId_fkey" FOREIGN KEY ("packetId") REFERENCES "MixturePacket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Component" ADD CONSTRAINT "Component_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Component" ADD CONSTRAINT "Component_substanceCas_fkey" FOREIGN KEY ("substanceCas") REFERENCES "Substance"("cas") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentSnapshot" ADD CONSTRAINT "DocumentSnapshot_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
