ALTER TABLE "ingestion_events"
  ADD COLUMN "lease_until" TIMESTAMP(3);

DROP INDEX IF EXISTS "ingestion_events_status_next_attempt_at_idx";
CREATE INDEX "ingestion_events_status_next_attempt_at_lease_until_idx"
  ON "ingestion_events"("status", "next_attempt_at", "lease_until");

-- Older deploys could leave events in PROCESSING forever. Make them reclaimable.
UPDATE "ingestion_events"
SET "lease_until" = CURRENT_TIMESTAMP
WHERE "status" = 'PROCESSING' AND "lease_until" IS NULL;

-- Apply the published seven-day failure-retention limit to existing payloads.
UPDATE "ingestion_events"
SET "raw_content_expires_at" = LEAST(
  COALESCE("raw_content_expires_at", CURRENT_TIMESTAMP + INTERVAL '7 days'),
  CURRENT_TIMESTAMP + INTERVAL '7 days'
)
WHERE "raw_content" IS NOT NULL;
