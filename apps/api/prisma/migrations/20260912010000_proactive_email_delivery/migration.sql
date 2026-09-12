CREATE TYPE "EmailDigestSchedule" AS ENUM ('MONDAY_0730', 'SUNDAY_1800');
CREATE TYPE "EmailDeliveryKind" AS ENUM ('WEEKLY_DIGEST', 'IMMINENT_BILL', 'PRICE_HIKE', 'PACING_WARNING', 'PAYDAY_RITUAL', 'TEST');
CREATE TYPE "EmailDeliveryStatus" AS ENUM ('PENDING', 'PROCESSING', 'ACCEPTED', 'DELIVERED', 'FAILED', 'BOUNCED', 'COMPLAINED', 'SUPPRESSED', 'UNKNOWN');

CREATE TABLE "email_notification_preferences" (
  "workspace_id" UUID NOT NULL,
  "profile_id" UUID NOT NULL,
  "weekly_digest_enabled" BOOLEAN NOT NULL DEFAULT false,
  "critical_alerts_enabled" BOOLEAN NOT NULL DEFAULT false,
  "digest_schedule" "EmailDigestSchedule" NOT NULL DEFAULT 'MONDAY_0730',
  "next_weekly_digest_at" TIMESTAMP(3),
  "last_critical_scan_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "email_notification_preferences_pkey" PRIMARY KEY ("workspace_id", "profile_id"),
  CONSTRAINT "email_notification_preferences_workspace_id_profile_id_fkey" FOREIGN KEY ("workspace_id", "profile_id") REFERENCES "workspace_members"("workspace_id", "profile_id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "email_deliveries" (
  "id" UUID NOT NULL,
  "workspace_id" UUID NOT NULL,
  "profile_id" UUID NOT NULL,
  "kind" "EmailDeliveryKind" NOT NULL,
  "status" "EmailDeliveryStatus" NOT NULL DEFAULT 'PENDING',
  "recipient" TEXT NOT NULL,
  "context_key" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "html" TEXT,
  "text" TEXT,
  "headers" JSONB,
  "provider_message_id" TEXT,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "max_attempts" INTEGER NOT NULL DEFAULT 5,
  "next_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lease_token" TEXT,
  "lease_until" TIMESTAMP(3),
  "error_code" TEXT,
  "accepted_at" TIMESTAMP(3),
  "delivered_at" TIMESTAMP(3),
  "processed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "email_deliveries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "email_deliveries_workspace_id_profile_id_fkey" FOREIGN KEY ("workspace_id", "profile_id") REFERENCES "workspace_members"("workspace_id", "profile_id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "email_delivery_events" (
  "id" UUID NOT NULL,
  "delivery_id" UUID NOT NULL,
  "provider_event_id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "occurred_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "email_delivery_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "email_delivery_events_delivery_id_fkey" FOREIGN KEY ("delivery_id") REFERENCES "email_deliveries"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "email_notification_preferences_weekly_digest_enabled_next_weekly_digest_at_idx" ON "email_notification_preferences"("weekly_digest_enabled", "next_weekly_digest_at");
CREATE INDEX "email_notification_preferences_critical_alerts_enabled_last_critical_scan_at_idx" ON "email_notification_preferences"("critical_alerts_enabled", "last_critical_scan_at");
CREATE UNIQUE INDEX "email_deliveries_provider_message_id_key" ON "email_deliveries"("provider_message_id");
CREATE UNIQUE INDEX "email_deliveries_workspace_id_profile_id_kind_context_key_key" ON "email_deliveries"("workspace_id", "profile_id", "kind", "context_key");
CREATE INDEX "email_deliveries_status_next_attempt_at_lease_until_idx" ON "email_deliveries"("status", "next_attempt_at", "lease_until");
CREATE INDEX "email_deliveries_profile_id_created_at_idx" ON "email_deliveries"("profile_id", "created_at");
CREATE UNIQUE INDEX "email_delivery_events_provider_event_id_key" ON "email_delivery_events"("provider_event_id");
CREATE INDEX "email_delivery_events_delivery_id_occurred_at_idx" ON "email_delivery_events"("delivery_id", "occurred_at");

-- These records contain delivery metadata and rendered financial summaries.
-- Cuadre accesses them only through the server-side API, never Supabase Data API.
ALTER TABLE "email_notification_preferences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "email_deliveries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "email_delivery_events" ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  app_role TEXT;
  app_table TEXT;
BEGIN
  FOREACH app_role IN ARRAY ARRAY['anon', 'authenticated']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = app_role) THEN
      FOREACH app_table IN ARRAY ARRAY[
        'email_notification_preferences', 'email_deliveries', 'email_delivery_events'
      ]
      LOOP
        EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE %I FROM %I', app_table, app_role);
      END LOOP;
    END IF;
  END LOOP;
END $$;
