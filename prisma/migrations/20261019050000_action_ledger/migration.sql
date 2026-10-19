-- T-10: Action Ledger. Wires OsAction into the propose → approve → execute → verify pipeline
-- and adds owner permission grants (allow once / for this task / always).

CREATE TYPE "OsGrantScope" AS ENUM ('ONCE', 'TASK', 'ALWAYS');

ALTER TABLE "OsAction" ADD COLUMN     "agentRunId" TEXT,
ADD COLUMN     "attempt" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "channelOrigin" TEXT,
ADD COLUMN     "connector" TEXT,
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "nextAttemptAt" TIMESTAMP(3),
ADD COLUMN     "ownerFacingSummary" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "requestedByUserId" UUID,
ADD COLUMN     "taskKey" TEXT,
ADD COLUMN     "undoUntil" TIMESTAMP(3);

CREATE TABLE "OsPermissionGrant" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "connector" TEXT NOT NULL,
    "scope" "OsGrantScope" NOT NULL,
    "taskKey" TEXT,
    "actionId" TEXT,
    "limitsJson" JSONB NOT NULL DEFAULT '{}',
    "grantedByUserId" UUID NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "OsPermissionGrant_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OsPermissionGrant_restaurantId_actionType_scope_idx" ON "OsPermissionGrant"("restaurantId", "actionType", "scope");
CREATE INDEX "OsAction_restaurantId_taskKey_idx" ON "OsAction"("restaurantId", "taskKey");
CREATE INDEX "OsAction_status_nextAttemptAt_idx" ON "OsAction"("status", "nextAttemptAt");

ALTER TABLE "OsPermissionGrant" ADD CONSTRAINT "OsPermissionGrant_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."OsPermissionGrant" ENABLE ROW LEVEL SECURITY;
