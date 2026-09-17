-- CreateEnum
CREATE TYPE "OsActionStatus" AS ENUM ('DETECTED', 'PROPOSED', 'AWAITING_APPROVAL', 'APPROVED', 'EXECUTING', 'EXECUTED', 'VERIFYING', 'VERIFIED', 'FAILED', 'REJECTED', 'ROLLED_BACK');
CREATE TYPE "OsPermissionMode" AS ENUM ('NEVER', 'ASK', 'AUTO_WITH_LIMITS', 'AUTOPILOT');
CREATE TYPE "OsFreshness" AS ENUM ('CURRENT', 'STALE', 'UNKNOWN');
CREATE TYPE "OsMeasurementMethod" AS ENUM ('SCALE_VISION', 'SCALE_ONLY', 'MANUAL_WEIGHT', 'THIRD_PARTY_SYNC', 'ESTIMATE');
CREATE TYPE "OsSensorStatus" AS ENUM ('HEALTHY', 'DEGRADED', 'OFFLINE', 'NEEDS_CALIBRATION');
CREATE TYPE "OsCapabilityLabel" AS ENUM ('LIVE', 'BETA', 'PREDICTION', 'INSIGHT', 'COMING_SOON');
CREATE TYPE "OsWasteType" AS ENUM ('OVERPRODUCTION', 'SPOILAGE', 'PREP_TRIM', 'QUALITY_REJECTION', 'COOKING_ERROR', 'ORDER_ERROR', 'PLATE_WASTE', 'UNKNOWN');

CREATE TABLE "OsLocation" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OsLocation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OsAction" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "locationId" TEXT,
    "actionType" TEXT NOT NULL,
    "sourceEventId" TEXT,
    "status" "OsActionStatus" NOT NULL DEFAULT 'DETECTED',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "proposedPayload" JSONB NOT NULL DEFAULT '{}',
    "executedPayload" JSONB NOT NULL DEFAULT '{}',
    "verificationPayload" JSONB NOT NULL DEFAULT '{}',
    "riskScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "confidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT true,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "executionStartedAt" TIMESTAMP(3),
    "executionCompletedAt" TIMESTAMP(3),
    "verificationStartedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "failureCode" TEXT,
    "failureReason" TEXT,
    "rollbackSupported" BOOLEAN NOT NULL DEFAULT false,
    "rollbackPayload" JSONB,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OsAction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OsRestaurantRule" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "locationId" TEXT,
    "scope" TEXT NOT NULL,
    "subjectType" TEXT NOT NULL DEFAULT '',
    "subjectId" TEXT,
    "ruleType" TEXT NOT NULL,
    "conditionJson" JSONB NOT NULL DEFAULT '{}',
    "actionJson" JSONB NOT NULL DEFAULT '{}',
    "permissionLevel" "OsPermissionMode" NOT NULL DEFAULT 'ASK',
    "source" TEXT NOT NULL DEFAULT 'owner',
    "createdBy" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastConfirmedAt" TIMESTAMP(3),
    CONSTRAINT "OsRestaurantRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OsActionPermission" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT '',
    "mode" "OsPermissionMode" NOT NULL DEFAULT 'ASK',
    "maxOrderValue" DOUBLE PRECISION,
    "maxPriceVariance" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OsActionPermission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OsDecisionEvidence" (
    "id" TEXT NOT NULL,
    "actionId" TEXT NOT NULL,
    "evidenceType" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceId" TEXT,
    "valueJson" JSONB NOT NULL DEFAULT '{}',
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OsDecisionEvidence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OsAuditEvent" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "actionId" TEXT,
    "kind" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OsAuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OsWorkflowReliability" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "d" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "e" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "v" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "c" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "f" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "u" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sampleN" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OsWorkflowReliability_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OsFact" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "locationId" TEXT,
    "key" TEXT NOT NULL,
    "valueJson" JSONB NOT NULL,
    "source" TEXT NOT NULL,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL,
    "freshness" "OsFreshness" NOT NULL DEFAULT 'UNKNOWN',
    CONSTRAINT "OsFact_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OsCapability" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "label" "OsCapabilityLabel" NOT NULL DEFAULT 'COMING_SOON',
    "gateJson" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OsCapability_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OsInvoice" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "vendorName" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'email',
    "headerJson" JSONB NOT NULL DEFAULT '{}',
    CONSTRAINT "OsInvoice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OsInvoiceLine" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "descriptionRaw" TEXT NOT NULL,
    "productId" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL,
    "packCount" DOUBLE PRECISION,
    "packSize" DOUBLE PRECISION,
    "unit" TEXT NOT NULL,
    "totalBaseQuantity" DOUBLE PRECISION NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "lineTotal" DOUBLE PRECISION NOT NULL,
    CONSTRAINT "OsInvoiceLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OsIngredient" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "substitutionPolicy" TEXT NOT NULL DEFAULT 'ASK',
    CONSTRAINT "OsIngredient_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OsRecipe" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "OsRecipe_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OsMenuItem" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "locationId" TEXT,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT '',
    "sellingPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "posExternalId" TEXT,
    "recipeId" TEXT,
    "estimatedFoodCost" DOUBLE PRECISION,
    "grossMargin" DOUBLE PRECISION,
    "prepStation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OsMenuItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OsRecipeIngredient" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "grossQuantity" DOUBLE PRECISION NOT NULL,
    "grossUnit" TEXT NOT NULL,
    "yieldPercentage" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "netQuantity" DOUBLE PRECISION NOT NULL,
    "netUnit" TEXT NOT NULL,
    "costPerUnit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "estimatedCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    CONSTRAINT "OsRecipeIngredient_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OsSupplier" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "OsSupplier_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OsSupplierProduct" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "ingredientId" TEXT,
    "sku" TEXT NOT NULL DEFAULT '',
    "packQty" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "packUnit" TEXT NOT NULL DEFAULT 'unit',
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deliveryCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "yieldPercentage" DOUBLE PRECISION NOT NULL DEFAULT 1,
    CONSTRAINT "OsSupplierProduct_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OsWasteEvent" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "locationId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stationId" TEXT,
    "grossWeight" DOUBLE PRECISION NOT NULL,
    "tareWeight" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netWeight" DOUBLE PRECISION NOT NULL,
    "predictedFoodId" TEXT,
    "classification" TEXT NOT NULL DEFAULT '',
    "visionConfidence" DOUBLE PRECISION,
    "combinedConfidence" DOUBLE PRECISION,
    "wasteType" "OsWasteType" NOT NULL DEFAULT 'UNKNOWN',
    "reasonPredicted" TEXT,
    "costPerUnit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "estimatedCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "measurementMethod" "OsMeasurementMethod" NOT NULL,
    "sensorId" TEXT,
    "imageReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OsWasteEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OsSensorHealth" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "sensorId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cameraOnline" BOOLEAN NOT NULL DEFAULT false,
    "scaleOnline" BOOLEAN NOT NULL DEFAULT false,
    "lastWeightEventAt" TIMESTAMP(3),
    "lastImageAt" TIMESTAMP(3),
    "lightingScore" DOUBLE PRECISION,
    "cameraObstructionScore" DOUBLE PRECISION,
    "scaleDriftScore" DOUBLE PRECISION,
    "networkStatus" TEXT NOT NULL DEFAULT 'unknown',
    "storageRemaining" DOUBLE PRECISION,
    "healthStatus" "OsSensorStatus" NOT NULL DEFAULT 'OFFLINE',
    CONSTRAINT "OsSensorHealth_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OsForecast" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "locationId" TEXT,
    "menuItemId" TEXT,
    "serviceAt" TIMESTAMP(3) NOT NULL,
    "expected" DOUBLE PRECISION NOT NULL,
    "p10" DOUBLE PRECISION NOT NULL,
    "p90" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    CONSTRAINT "OsForecast_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OsAction_restaurantId_idempotencyKey_key" ON "OsAction"("restaurantId", "idempotencyKey");
CREATE INDEX "OsAction_restaurantId_status_createdAt_idx" ON "OsAction"("restaurantId", "status", "createdAt");
CREATE UNIQUE INDEX "OsActionPermission_restaurantId_actionType_category_key" ON "OsActionPermission"("restaurantId", "actionType", "category");
CREATE UNIQUE INDEX "OsWorkflowReliability_restaurantId_workflowId_key" ON "OsWorkflowReliability"("restaurantId", "workflowId");
CREATE UNIQUE INDEX "OsCapability_restaurantId_workflowId_key" ON "OsCapability"("restaurantId", "workflowId");
CREATE INDEX "OsLocation_restaurantId_idx" ON "OsLocation"("restaurantId");
CREATE INDEX "OsRestaurantRule_restaurantId_scope_ruleType_idx" ON "OsRestaurantRule"("restaurantId", "scope", "ruleType");
CREATE INDEX "OsDecisionEvidence_actionId_idx" ON "OsDecisionEvidence"("actionId");
CREATE INDEX "OsAuditEvent_restaurantId_createdAt_idx" ON "OsAuditEvent"("restaurantId", "createdAt");
CREATE INDEX "OsFact_restaurantId_key_idx" ON "OsFact"("restaurantId", "key");
CREATE INDEX "OsInvoice_restaurantId_receivedAt_idx" ON "OsInvoice"("restaurantId", "receivedAt");
CREATE INDEX "OsInvoiceLine_invoiceId_idx" ON "OsInvoiceLine"("invoiceId");
CREATE INDEX "OsIngredient_restaurantId_idx" ON "OsIngredient"("restaurantId");
CREATE INDEX "OsRecipe_restaurantId_idx" ON "OsRecipe"("restaurantId");
CREATE INDEX "OsMenuItem_restaurantId_idx" ON "OsMenuItem"("restaurantId");
CREATE INDEX "OsRecipeIngredient_recipeId_idx" ON "OsRecipeIngredient"("recipeId");
CREATE INDEX "OsSupplier_restaurantId_idx" ON "OsSupplier"("restaurantId");
CREATE INDEX "OsSupplierProduct_supplierId_idx" ON "OsSupplierProduct"("supplierId");
CREATE INDEX "OsWasteEvent_restaurantId_timestamp_idx" ON "OsWasteEvent"("restaurantId", "timestamp");
CREATE INDEX "OsSensorHealth_restaurantId_sensorId_timestamp_idx" ON "OsSensorHealth"("restaurantId", "sensorId", "timestamp");
CREATE INDEX "OsForecast_restaurantId_serviceAt_idx" ON "OsForecast"("restaurantId", "serviceAt");

ALTER TABLE "OsLocation" ADD CONSTRAINT "OsLocation_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OsAction" ADD CONSTRAINT "OsAction_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OsAction" ADD CONSTRAINT "OsAction_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "OsLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OsRestaurantRule" ADD CONSTRAINT "OsRestaurantRule_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OsRestaurantRule" ADD CONSTRAINT "OsRestaurantRule_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "OsLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OsActionPermission" ADD CONSTRAINT "OsActionPermission_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OsDecisionEvidence" ADD CONSTRAINT "OsDecisionEvidence_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "OsAction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OsAuditEvent" ADD CONSTRAINT "OsAuditEvent_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OsAuditEvent" ADD CONSTRAINT "OsAuditEvent_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "OsAction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OsWorkflowReliability" ADD CONSTRAINT "OsWorkflowReliability_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OsFact" ADD CONSTRAINT "OsFact_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OsFact" ADD CONSTRAINT "OsFact_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "OsLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OsCapability" ADD CONSTRAINT "OsCapability_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OsInvoice" ADD CONSTRAINT "OsInvoice_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OsInvoiceLine" ADD CONSTRAINT "OsInvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "OsInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OsIngredient" ADD CONSTRAINT "OsIngredient_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OsRecipe" ADD CONSTRAINT "OsRecipe_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OsMenuItem" ADD CONSTRAINT "OsMenuItem_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OsMenuItem" ADD CONSTRAINT "OsMenuItem_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "OsRecipe"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OsRecipeIngredient" ADD CONSTRAINT "OsRecipeIngredient_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "OsRecipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OsRecipeIngredient" ADD CONSTRAINT "OsRecipeIngredient_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "OsIngredient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OsSupplier" ADD CONSTRAINT "OsSupplier_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OsSupplierProduct" ADD CONSTRAINT "OsSupplierProduct_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "OsSupplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OsSupplierProduct" ADD CONSTRAINT "OsSupplierProduct_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "OsIngredient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OsWasteEvent" ADD CONSTRAINT "OsWasteEvent_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OsWasteEvent" ADD CONSTRAINT "OsWasteEvent_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "OsLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OsSensorHealth" ADD CONSTRAINT "OsSensorHealth_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OsForecast" ADD CONSTRAINT "OsForecast_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OsForecast" ADD CONSTRAINT "OsForecast_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "OsLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OsForecast" ADD CONSTRAINT "OsForecast_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "OsMenuItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
