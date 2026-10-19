-- CreateTable
CREATE TABLE "RoiWeek" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "weekStart" DATE NOT NULL,
    "timezone" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "metricsJson" JSONB NOT NULL DEFAULT '{}',
    "standardMinutesVersion" TEXT NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoiWeek_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RoiWeek_restaurantId_weekStart_key" ON "RoiWeek"("restaurantId", "weekStart");

-- AddForeignKey
ALTER TABLE "RoiWeek" ADD CONSTRAINT "RoiWeek_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Deny-all RLS (T-07): the app connects as the table owner; anon/authenticated roles see nothing.
ALTER TABLE "public"."RoiWeek" ENABLE ROW LEVEL SECURITY;
