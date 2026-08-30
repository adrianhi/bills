ALTER TYPE "IngestionJobType" ADD VALUE IF NOT EXISTS 'GMAIL_BANK_BACKFILL';

ALTER TABLE "oauth_states"
  ADD COLUMN "institution_codes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE TABLE "inbox_institution_subscriptions" (
  "id" UUID NOT NULL,
  "inbox_connection_id" UUID NOT NULL,
  "institution_code" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "inbox_institution_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "inbox_institution_subscriptions_inbox_connection_id_institution_code_key"
  ON "inbox_institution_subscriptions"("inbox_connection_id", "institution_code");
CREATE INDEX "inbox_institution_subscriptions_institution_code_enabled_idx"
  ON "inbox_institution_subscriptions"("institution_code", "enabled");

ALTER TABLE "inbox_institution_subscriptions"
  ADD CONSTRAINT "inbox_institution_subscriptions_inbox_connection_id_fkey"
  FOREIGN KEY ("inbox_connection_id") REFERENCES "inbox_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inbox_institution_subscriptions"
  ADD CONSTRAINT "inbox_institution_subscriptions_institution_code_fkey"
  FOREIGN KEY ("institution_code") REFERENCES "financial_institutions"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inbox_institution_subscriptions" ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE app_role TEXT;
BEGIN
  FOREACH app_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = app_role) THEN
      EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE %I FROM %I', 'inbox_institution_subscriptions', app_role);
    END IF;
  END LOOP;
END $$;

UPDATE "financial_institutions"
SET "status" = 'PILOT',
    "sender_patterns" = ARRAY['notificaciones@banreservas.com', 'notificacionestubancoapp@banreservas.com'],
    "updated_at" = CURRENT_TIMESTAMP
WHERE "code" = 'BANRESERVAS';

UPDATE "bank_connections"
SET "status" = 'DISABLED', "updated_at" = CURRENT_TIMESTAMP
WHERE "ingestion_channel" = 'EMAIL_FORWARD';

UPDATE "ingestion_addresses"
SET "is_active" = false
WHERE "is_active" = true;

UPDATE "ingestion_events"
SET "status" = 'IGNORED',
    "error_code" = 'CHANNEL_RETIRED',
    "error_message" = NULL,
    "raw_content" = NULL,
    "raw_content_expires_at" = NULL,
    "next_attempt_at" = NULL,
    "lease_until" = NULL,
    "processed_at" = COALESCE("processed_at", CURRENT_TIMESTAMP),
    "updated_at" = CURRENT_TIMESTAMP
WHERE "provider" = 'RESEND' AND "status" IN ('PENDING', 'PROCESSING');

UPDATE "ingestion_events"
SET "raw_content" = NULL,
    "raw_content_expires_at" = NULL,
    "updated_at" = CURRENT_TIMESTAMP
WHERE "provider" = 'RESEND' AND "raw_content" IS NOT NULL;
