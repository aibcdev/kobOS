-- CreateTable
CREATE TABLE "public"."RestaurantScoreIndex" (
    "id" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'GB',
    "websiteUrl" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "rating" DOUBLE PRECISION,
    "reviewCount" INTEGER,
    "photoCount" INTEGER,
    "kobScore" INTEGER NOT NULL,
    "scanDepth" TEXT NOT NULL DEFAULT 'lightweight',
    "scoredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RestaurantScoreIndex_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RestaurantScoreIndex_placeId_key" ON "public"."RestaurantScoreIndex"("placeId");

-- CreateIndex
CREATE INDEX "RestaurantScoreIndex_city_kobScore_idx" ON "public"."RestaurantScoreIndex"("city", "kobScore");

-- CreateIndex
CREATE INDEX "RestaurantScoreIndex_country_kobScore_idx" ON "public"."RestaurantScoreIndex"("country", "kobScore");

-- CreateIndex
CREATE INDEX "RestaurantScoreIndex_lat_lng_idx" ON "public"."RestaurantScoreIndex"("lat", "lng");
