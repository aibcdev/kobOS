-- One live link per provider account: a Square merchant or Clover merchant can't be attached to two restaurants,
-- so webhooks always route to exactly one tenant. Disconnected rows keep their history and don't count.
-- Partial index, not expressible in schema.prisma; the plain (provider, externalAccountId) index stays for lookups.
CREATE UNIQUE INDEX "Integration_live_provider_account_key"
  ON "Integration"("provider", "externalAccountId")
  WHERE "status" <> 'DISCONNECTED' AND "externalAccountId" IS NOT NULL;
