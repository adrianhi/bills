CREATE TYPE "RecurringCadence" AS ENUM ('BIWEEKLY', 'MONTHLY', 'ANNUAL');
CREATE TYPE "RecurringStatus" AS ENUM ('SUGGESTED', 'CONFIRMED', 'PAUSED', 'DISMISSED');
CREATE TYPE "RecurringAlertKind" AS ENUM ('PRICE_HIKE', 'MISSED_EXPECTED_CHARGE');
CREATE TYPE "RecurringScanStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');

CREATE TABLE "recurring_bills" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "workspace_id" UUID NOT NULL,
  "identity_key" TEXT NOT NULL, "display_name" TEXT NOT NULL, "currency" TEXT NOT NULL,
  "cadence" "RecurringCadence" NOT NULL, "expected_amount" DECIMAL(18,2) NOT NULL,
  "next_expected_date" DATE NOT NULL, "last_seen_at" TIMESTAMP(3) NOT NULL,
  "occurrence_count" INTEGER NOT NULL DEFAULT 2, "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  "status" "RecurringStatus" NOT NULL DEFAULT 'SUGGESTED', "user_edited_at" TIMESTAMP(3),
  "dismissed_amount" DECIMAL(18,2), "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "recurring_bills_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "recurring_bills_workspace_id_identity_key_currency_key" ON "recurring_bills"("workspace_id", "identity_key", "currency");
CREATE INDEX "recurring_bills_workspace_id_currency_status_next_expected_idx" ON "recurring_bills"("workspace_id", "currency", "status", "next_expected_date");

CREATE TABLE "recurring_occurrences" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "recurring_bill_id" UUID NOT NULL,
  "transaction_id" TEXT NOT NULL, "amount" DECIMAL(18,2) NOT NULL,
  "occurred_at" TIMESTAMP(3) NOT NULL, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "recurring_occurrences_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "recurring_occurrences_transaction_id_key" ON "recurring_occurrences"("transaction_id");
CREATE INDEX "recurring_occurrences_recurring_bill_id_occurred_at_idx" ON "recurring_occurrences"("recurring_bill_id", "occurred_at");

CREATE TABLE "recurring_alerts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "recurring_bill_id" UUID NOT NULL,
  "kind" "RecurringAlertKind" NOT NULL, "source_transaction_id" TEXT,
  "baseline_amount" DECIMAL(18,2), "observed_amount" DECIMAL(18,2),
  "acknowledged_at" TIMESTAMP(3), "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "recurring_alerts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "recurring_alerts_bill_kind_source_key" ON "recurring_alerts"("recurring_bill_id", "kind", "source_transaction_id");
CREATE INDEX "recurring_alerts_bill_ack_idx" ON "recurring_alerts"("recurring_bill_id", "acknowledged_at");

CREATE TABLE "recurring_scan_jobs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "workspace_id" UUID NOT NULL,
  "status" "RecurringScanStatus" NOT NULL DEFAULT 'PENDING', "cursor" INTEGER NOT NULL DEFAULT 0,
  "attempts" INTEGER NOT NULL DEFAULT 0, "next_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lease_until" TIMESTAMP(3), "last_scanned_at" TIMESTAMP(3), "error_code" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "recurring_scan_jobs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "recurring_scan_jobs_workspace_id_key" ON "recurring_scan_jobs"("workspace_id");
CREATE INDEX "recurring_scan_jobs_status_next_lease_idx" ON "recurring_scan_jobs"("status", "next_attempt_at", "lease_until");

CREATE TABLE "payday_ritual_reviews" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "workspace_id" UUID NOT NULL,
  "profile_id" UUID NOT NULL, "cycle_key" TEXT NOT NULL,
  "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payday_ritual_reviews_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "payday_reviews_workspace_profile_cycle_key" ON "payday_ritual_reviews"("workspace_id", "profile_id", "cycle_key");

CREATE TABLE "product_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "workspace_id" UUID NOT NULL,
  "profile_id" UUID NOT NULL, "name" TEXT NOT NULL, "context_key" TEXT NOT NULL,
  "properties" JSONB, "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "product_events_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "product_events_workspace_profile_name_context_key" ON "product_events"("workspace_id", "profile_id", "name", "context_key");
CREATE INDEX "product_events_occurred_at_idx" ON "product_events"("occurred_at");

ALTER TABLE "recurring_bills" ADD CONSTRAINT "recurring_bills_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recurring_occurrences" ADD CONSTRAINT "recurring_occurrences_bill_id_fkey" FOREIGN KEY ("recurring_bill_id") REFERENCES "recurring_bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recurring_occurrences" ADD CONSTRAINT "recurring_occurrences_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recurring_alerts" ADD CONSTRAINT "recurring_alerts_bill_id_fkey" FOREIGN KEY ("recurring_bill_id") REFERENCES "recurring_bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recurring_scan_jobs" ADD CONSTRAINT "recurring_scan_jobs_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payday_ritual_reviews" ADD CONSTRAINT "payday_reviews_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payday_ritual_reviews" ADD CONSTRAINT "payday_reviews_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_events" ADD CONSTRAINT "product_events_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_events" ADD CONSTRAINT "product_events_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "transactions" ADD COLUMN "deleted_at" TIMESTAMP(3);
CREATE INDEX "transactions_workspace_id_deleted_at_idx" ON "transactions"("workspace_id", "deleted_at");

INSERT INTO "recurring_scan_jobs" ("workspace_id", "updated_at") SELECT "id", CURRENT_TIMESTAMP FROM "workspaces" ON CONFLICT DO NOTHING;

ALTER TABLE "recurring_bills" ADD CONSTRAINT "recurring_bills_expected_amount_check" CHECK ("expected_amount" > 0);
ALTER TABLE "recurring_bills" ADD CONSTRAINT "recurring_bills_currency_check" CHECK ("currency" IN ('DOP', 'USD'));
ALTER TABLE "payday_ritual_reviews" ADD CONSTRAINT "payday_cycle_key_shape_check" CHECK ("cycle_key" ~ '^\d{4}-\d{2}-\d{2}$');

ALTER TABLE "recurring_bills" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "recurring_occurrences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "recurring_alerts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "recurring_scan_jobs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payday_ritual_reviews" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "product_events" ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE app_role TEXT;
DECLARE table_name TEXT;
BEGIN
  FOREACH app_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = app_role) THEN
      FOREACH table_name IN ARRAY ARRAY[
        'recurring_bills', 'recurring_occurrences', 'recurring_alerts',
        'recurring_scan_jobs', 'payday_ritual_reviews', 'product_events'
      ] LOOP
        EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE %I FROM %I', table_name, app_role);
      END LOOP;
    END IF;
  END LOOP;
END $$;
