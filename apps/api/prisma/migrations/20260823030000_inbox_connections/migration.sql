CREATE TYPE "InboxProvider" AS ENUM ('GOOGLE', 'MICROSOFT', 'EMAIL_FORWARD');
CREATE TYPE "InboxConnectionStatus" AS ENUM ('PENDING', 'ACTIVE', 'REAUTH_REQUIRED', 'ERROR', 'REVOKED');

CREATE TABLE "inbox_connections" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "provider" "InboxProvider" NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" "InboxConnectionStatus" NOT NULL DEFAULT 'PENDING',
    "encrypted_access_token" TEXT,
    "encrypted_refresh_token" TEXT,
    "token_expires_at" TIMESTAMP(3),
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sync_cursor" TEXT,
    "last_synced_at" TIMESTAMP(3),
    "last_error_code" TEXT,
    "granted_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "inbox_connections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "oauth_states" (
    "id" TEXT NOT NULL,
    "workspace_id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "provider" "InboxProvider" NOT NULL,
    "return_to" TEXT NOT NULL DEFAULT '/onboarding',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "oauth_states_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "bank_connections" ADD COLUMN "inbox_connection_id" UUID;
ALTER TABLE "ingestion_events" ADD COLUMN "inbox_connection_id" UUID;

CREATE UNIQUE INDEX "inbox_connections_workspace_id_provider_provider_account_id_key"
  ON "inbox_connections"("workspace_id", "provider", "provider_account_id");
CREATE INDEX "inbox_connections_workspace_id_status_idx"
  ON "inbox_connections"("workspace_id", "status");
CREATE INDEX "oauth_states_expires_at_idx" ON "oauth_states"("expires_at");
CREATE INDEX "bank_connections_inbox_connection_id_idx" ON "bank_connections"("inbox_connection_id");
CREATE INDEX "ingestion_events_inbox_connection_id_created_at_idx"
  ON "ingestion_events"("inbox_connection_id", "created_at");

ALTER TABLE "inbox_connections"
  ADD CONSTRAINT "inbox_connections_workspace_id_fkey"
  FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "oauth_states"
  ADD CONSTRAINT "oauth_states_workspace_id_fkey"
  FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "oauth_states"
  ADD CONSTRAINT "oauth_states_profile_id_fkey"
  FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bank_connections"
  ADD CONSTRAINT "bank_connections_inbox_connection_id_fkey"
  FOREIGN KEY ("inbox_connection_id") REFERENCES "inbox_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ingestion_events"
  ADD CONSTRAINT "ingestion_events_inbox_connection_id_fkey"
  FOREIGN KEY ("inbox_connection_id") REFERENCES "inbox_connections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "financial_institutions"
SET "status" = 'PILOT',
    "sender_patterns" = ARRAY['@qik.do', '@qik.com.do'],
    "updated_at" = CURRENT_TIMESTAMP
WHERE "code" = 'QIK';

ALTER TABLE "inbox_connections" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "oauth_states" ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  app_role TEXT;
BEGIN
  FOREACH app_role IN ARRAY ARRAY['anon', 'authenticated']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = app_role) THEN
      EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE %I FROM %I', 'inbox_connections', app_role);
      EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE %I FROM %I', 'oauth_states', app_role);
    END IF;
  END LOOP;
END $$;
