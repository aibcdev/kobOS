-- AlterEnum: human-approved queue state (still no auto-send)
ALTER TYPE "OutboundLeadStatus" ADD VALUE 'APPROVED' AFTER 'PENDING_APPROVAL';
