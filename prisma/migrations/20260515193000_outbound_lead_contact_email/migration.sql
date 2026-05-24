-- Optional recipient for approved outbound sends (Inngest + Resend).
ALTER TABLE "OutboundLead" ADD COLUMN "contactEmail" TEXT;
