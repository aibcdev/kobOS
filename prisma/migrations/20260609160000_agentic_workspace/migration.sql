-- Agentic workspace: chat, sales snapshots, review themes, app pins

CREATE TYPE "public"."MessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');
CREATE TYPE "public"."SalesSnapshotSource" AS ENUM ('SQUARE', 'TOAST', 'MANUAL', 'SAMPLE');
CREATE TYPE "public"."ReviewTheme" AS ENUM ('FOOD', 'SERVICE', 'PRICE', 'SPEED', 'ATMOSPHERE', 'CLEANLINESS');
CREATE TYPE "public"."ReviewSentiment" AS ENUM ('POSITIVE', 'NEGATIVE', 'NEUTRAL');

ALTER TABLE "public"."Restaurant" ADD COLUMN "useSampleData" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "public"."Conversation" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'New chat',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "public"."MessageRole" NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "toolCalls" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."SalesSnapshot" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "revenueCents" INTEGER NOT NULL DEFAULT 0,
    "orderCount" INTEGER NOT NULL DEFAULT 0,
    "source" "public"."SalesSnapshotSource" NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SalesSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."SocialSnapshot" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "followers" INTEGER NOT NULL DEFAULT 0,
    "postEngagements" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'INSTAGRAM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SocialSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."ReviewThemeTag" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "theme" "public"."ReviewTheme" NOT NULL,
    "sentiment" "public"."ReviewSentiment" NOT NULL,
    CONSTRAINT "ReviewThemeTag_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."WorkspaceAppPin" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "href" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'grid',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkspaceAppPin_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Conversation_restaurantId_updatedAt_idx" ON "public"."Conversation"("restaurantId", "updatedAt");
CREATE INDEX "Message_conversationId_createdAt_idx" ON "public"."Message"("conversationId", "createdAt");
CREATE INDEX "SalesSnapshot_restaurantId_date_idx" ON "public"."SalesSnapshot"("restaurantId", "date");
CREATE UNIQUE INDEX "SalesSnapshot_restaurantId_date_source_key" ON "public"."SalesSnapshot"("restaurantId", "date", "source");
CREATE INDEX "SocialSnapshot_restaurantId_date_idx" ON "public"."SocialSnapshot"("restaurantId", "date");
CREATE UNIQUE INDEX "SocialSnapshot_restaurantId_date_source_key" ON "public"."SocialSnapshot"("restaurantId", "date", "source");
CREATE INDEX "ReviewThemeTag_reviewId_idx" ON "public"."ReviewThemeTag"("reviewId");
CREATE UNIQUE INDEX "ReviewThemeTag_reviewId_theme_key" ON "public"."ReviewThemeTag"("reviewId", "theme");
CREATE INDEX "WorkspaceAppPin_restaurantId_createdAt_idx" ON "public"."WorkspaceAppPin"("restaurantId", "createdAt");

ALTER TABLE "public"."Conversation" ADD CONSTRAINT "Conversation_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "public"."Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."SalesSnapshot" ADD CONSTRAINT "SalesSnapshot_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."SocialSnapshot" ADD CONSTRAINT "SocialSnapshot_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."ReviewThemeTag" ADD CONSTRAINT "ReviewThemeTag_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "public"."CustomerReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."WorkspaceAppPin" ADD CONSTRAINT "WorkspaceAppPin_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
