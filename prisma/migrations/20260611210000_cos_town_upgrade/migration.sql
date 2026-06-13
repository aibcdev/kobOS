-- Town-style Chief of Staff: task<->chat link + calendar/email providers

ALTER TYPE "public"."IntegrationProvider" ADD VALUE IF NOT EXISTS 'GOOGLE_CALENDAR';
ALTER TYPE "public"."IntegrationProvider" ADD VALUE IF NOT EXISTS 'GMAIL';

ALTER TABLE "public"."ChiefOfStaffTask" ADD COLUMN "conversationId" TEXT;
