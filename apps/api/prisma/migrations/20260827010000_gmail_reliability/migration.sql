CREATE TYPE "TransactionStatusCode" AS ENUM ('PENDING', 'APPROVED', 'DECLINED', 'REVERSED');
CREATE TYPE "TransactionStatusResolution" AS ENUM ('MATCHED', 'UNMATCHED', 'AMBIGUOUS');
CREATE TYPE "IngestionJobType" AS ENUM (
  'GMAIL_INITIAL_BACKFILL',
  'GMAIL_HISTORY_SYNC',
  'GMAIL_RECONCILIATION',
  'GMAIL_WATCH_RENEWAL',
  'GMAIL_FAILED_REPLAY'
);
CREATE TYPE "IngestionJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED');

ALTER TABLE "inbox_connections"
  ADD COLUMN "last_successful_sync_at" TIMESTAMP(3),
  ADD COLUMN "next_reconcile_at" TIMESTAMP(3),
  ADD COLUMN "sync_lease_until" TIMESTAMP(3),
  ADD COLUMN "watch_expires_at" TIMESTAMP(3),
  ADD COLUMN "last_sync_summary" JSONB;

ALTER TABLE "transactions"
  ADD COLUMN "status_code" "TransactionStatusCode" NOT NULL DEFAULT 'APPROVED',
  ADD COLUMN "status_updated_at" TIMESTAMP(3);

UPDATE "transactions"
SET "status_code" = CASE
  WHEN "status" ~* '(reversad|anulad)' THEN 'REVERSED'::"TransactionStatusCode"
  WHEN "status" ~* '(rechazad|declinad|denegad)' THEN 'DECLINED'::"TransactionStatusCode"
  WHEN "status" ~* '(pendiente|procesando)' THEN 'PENDING'::"TransactionStatusCode"
  ELSE 'APPROVED'::"TransactionStatusCode"
END;

CREATE TABLE "ingestion_jobs" (
  "id" UUID NOT NULL,
  "workspace_id" UUID NOT NULL,
  "inbox_connection_id" UUID NOT NULL,
  "type" "IngestionJobType" NOT NULL,
  "status" "IngestionJobStatus" NOT NULL DEFAULT 'PENDING',
  "dedupe_key" TEXT NOT NULL,
  "payload" JSONB,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "max_attempts" INTEGER NOT NULL DEFAULT 5,
  "next_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lease_until" TIMESTAMP(3),
  "error_code" TEXT,
  "error_message" TEXT,
  "started_at" TIMESTAMP(3),
  "processed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ingestion_jobs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "transaction_status_events" (
  "id" UUID NOT NULL,
  "workspace_id" UUID NOT NULL,
  "transaction_id" TEXT,
  "institution_code" TEXT NOT NULL,
  "external_id" TEXT NOT NULL,
  "status_code" "TransactionStatusCode" NOT NULL,
  "resolution" "TransactionStatusResolution" NOT NULL DEFAULT 'UNMATCHED',
  "event_date" TIMESTAMP(3) NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'DOP',
  "card_last_4" TEXT,
  "raw_merchant" TEXT,
  "bank_reference" TEXT,
  "source" TEXT NOT NULL,
  "ingestion_channel" "IngestionChannel" NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "transaction_status_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ingestion_jobs_dedupe_key_key" ON "ingestion_jobs"("dedupe_key");
CREATE INDEX "ingestion_jobs_status_next_attempt_at_idx" ON "ingestion_jobs"("status", "next_attempt_at");
CREATE INDEX "ingestion_jobs_inbox_connection_id_created_at_idx" ON "ingestion_jobs"("inbox_connection_id", "created_at");
CREATE UNIQUE INDEX "transaction_status_events_workspace_id_institution_code_external_id_key"
  ON "transaction_status_events"("workspace_id", "institution_code", "external_id");
CREATE INDEX "transaction_status_events_workspace_id_institution_code_event_date_idx"
  ON "transaction_status_events"("workspace_id", "institution_code", "event_date");
CREATE INDEX "transaction_status_events_transaction_id_event_date_idx"
  ON "transaction_status_events"("transaction_id", "event_date");
CREATE INDEX "transaction_status_events_resolution_status_code_idx"
  ON "transaction_status_events"("resolution", "status_code");

ALTER TABLE "ingestion_jobs"
  ADD CONSTRAINT "ingestion_jobs_workspace_id_fkey"
  FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ingestion_jobs"
  ADD CONSTRAINT "ingestion_jobs_inbox_connection_id_fkey"
  FOREIGN KEY ("inbox_connection_id") REFERENCES "inbox_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "transaction_status_events"
  ADD CONSTRAINT "transaction_status_events_workspace_id_fkey"
  FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "transaction_status_events"
  ADD CONSTRAINT "transaction_status_events_transaction_id_fkey"
  FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "transaction_status_events"
  ADD CONSTRAINT "transaction_status_events_institution_code_fkey"
  FOREIGN KEY ("institution_code") REFERENCES "financial_institutions"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

UPDATE "ingestion_events"
SET "raw_content_expires_at" = GREATEST(
  COALESCE("raw_content_expires_at", CURRENT_TIMESTAMP),
  CURRENT_TIMESTAMP + INTERVAL '30 days'
)
WHERE "provider" = 'GOOGLE_GMAIL'
  AND "status" = 'FAILED'
  AND "raw_content" IS NOT NULL;
