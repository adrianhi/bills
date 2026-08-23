CREATE TYPE "WorkspaceType" AS ENUM ('PERSONAL');
CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'MEMBER');
CREATE TYPE "PlanTier" AS ENUM ('BETA');
CREATE TYPE "InstitutionStatus" AS ENUM ('PILOT', 'ACTIVE', 'COMING_SOON', 'DISABLED');
CREATE TYPE "IngestionChannel" AS ENUM ('EMAIL_FORWARD', 'MANUAL', 'CSV_IMPORT', 'GMAIL_OAUTH');
CREATE TYPE "ConnectionStatus" AS ENUM ('PENDING', 'VERIFYING', 'ACTIVE', 'ERROR', 'DISABLED');
CREATE TYPE "IngestionEventStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'IGNORED', 'FAILED');

DROP INDEX "transactions_external_id_key";
DROP INDEX "category_rules_pattern_key";

ALTER TABLE "transactions"
  ADD COLUMN "ingestion_channel" "IngestionChannel" NOT NULL DEFAULT 'EMAIL_FORWARD',
  ADD COLUMN "institution_code" TEXT NOT NULL DEFAULT 'BHD',
  ADD COLUMN "workspace_id" UUID,
  ALTER COLUMN "amount" SET DATA TYPE DECIMAL(18,2);

ALTER TABLE "category_rules" ADD COLUMN "workspace_id" UUID;

CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "display_name" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/Santo_Domingo',
    "default_currency" TEXT NOT NULL DEFAULT 'DOP',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workspaces" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "WorkspaceType" NOT NULL DEFAULT 'PERSONAL',
    "plan_tier" "PlanTier" NOT NULL DEFAULT 'BETA',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workspace_members" (
    "workspace_id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'OWNER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "workspace_members_pkey" PRIMARY KEY ("workspace_id","profile_id")
);

CREATE TABLE "financial_institutions" (
    "code" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "status" "InstitutionStatus" NOT NULL DEFAULT 'COMING_SOON',
    "sender_patterns" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "financial_institutions_pkey" PRIMARY KEY ("code")
);

INSERT INTO "financial_institutions" ("code", "display_name", "status", "sender_patterns", "updated_at") VALUES
  ('BHD', 'Banco BHD', 'PILOT', ARRAY['alertas@bhd.com.do', '@bhd.com.do'], CURRENT_TIMESTAMP),
  ('POPULAR', 'Banco Popular', 'COMING_SOON', ARRAY[]::TEXT[], CURRENT_TIMESTAMP),
  ('BANRESERVAS', 'Banreservas', 'COMING_SOON', ARRAY[]::TEXT[], CURRENT_TIMESTAMP),
  ('QIK', 'Qik Banco Digital', 'COMING_SOON', ARRAY[]::TEXT[], CURRENT_TIMESTAMP),
  ('APAP', 'APAP', 'COMING_SOON', ARRAY[]::TEXT[], CURRENT_TIMESTAMP),
  ('SCOTIABANK', 'Scotiabank', 'COMING_SOON', ARRAY[]::TEXT[], CURRENT_TIMESTAMP),
  ('CASH', 'Manual / Efectivo', 'ACTIVE', ARRAY[]::TEXT[], CURRENT_TIMESTAMP);

CREATE TABLE "bank_connections" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "institution_code" TEXT NOT NULL,
    "ingestion_channel" "IngestionChannel" NOT NULL DEFAULT 'EMAIL_FORWARD',
    "status" "ConnectionStatus" NOT NULL DEFAULT 'PENDING',
    "source_email" TEXT,
    "source_email_verified" BOOLEAN NOT NULL DEFAULT false,
    "last_event_at" TIMESTAMP(3),
    "last_error_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "bank_connections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ingestion_addresses" (
    "id" UUID NOT NULL,
    "bank_connection_id" UUID NOT NULL,
    "alias_token" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rotated_at" TIMESTAMP(3),
    CONSTRAINT "ingestion_addresses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ingestion_events" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "bank_connection_id" UUID,
    "provider" TEXT NOT NULL DEFAULT 'RESEND',
    "provider_event_id" TEXT NOT NULL,
    "provider_email_id" TEXT,
    "status" "IngestionEventStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "parser_code" TEXT,
    "parser_version" TEXT,
    "error_code" TEXT,
    "error_message" TEXT,
    "raw_content" TEXT,
    "raw_content_expires_at" TIMESTAMP(3),
    "next_attempt_at" TIMESTAMP(3),
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ingestion_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "beta_invites" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "beta_invites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "profiles_email_key" ON "profiles"("email");
CREATE INDEX "workspace_members_profile_id_idx" ON "workspace_members"("profile_id");
CREATE INDEX "bank_connections_workspace_id_status_idx" ON "bank_connections"("workspace_id", "status");
CREATE UNIQUE INDEX "bank_connections_workspace_id_institution_code_ingestion_ch_key" ON "bank_connections"("workspace_id", "institution_code", "ingestion_channel");
CREATE UNIQUE INDEX "ingestion_addresses_bank_connection_id_key" ON "ingestion_addresses"("bank_connection_id");
CREATE UNIQUE INDEX "ingestion_addresses_alias_token_key" ON "ingestion_addresses"("alias_token");
CREATE UNIQUE INDEX "ingestion_events_provider_event_id_key" ON "ingestion_events"("provider_event_id");
CREATE INDEX "ingestion_events_status_next_attempt_at_idx" ON "ingestion_events"("status", "next_attempt_at");
CREATE INDEX "ingestion_events_workspace_id_created_at_idx" ON "ingestion_events"("workspace_id", "created_at");
CREATE UNIQUE INDEX "beta_invites_email_key" ON "beta_invites"("email");
CREATE INDEX "transactions_workspace_id_transaction_date_idx" ON "transactions"("workspace_id", "transaction_date");
CREATE INDEX "transactions_workspace_id_institution_code_idx" ON "transactions"("workspace_id", "institution_code");
CREATE UNIQUE INDEX "transactions_workspace_id_institution_code_external_id_key" ON "transactions"("workspace_id", "institution_code", "external_id");
CREATE INDEX "category_rules_workspace_id_priority_idx" ON "category_rules"("workspace_id", "priority");
CREATE UNIQUE INDEX "category_rules_workspace_id_pattern_key" ON "category_rules"("workspace_id", "pattern");

ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bank_connections" ADD CONSTRAINT "bank_connections_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bank_connections" ADD CONSTRAINT "bank_connections_institution_code_fkey" FOREIGN KEY ("institution_code") REFERENCES "financial_institutions"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ingestion_addresses" ADD CONSTRAINT "ingestion_addresses_bank_connection_id_fkey" FOREIGN KEY ("bank_connection_id") REFERENCES "bank_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ingestion_events" ADD CONSTRAINT "ingestion_events_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ingestion_events" ADD CONSTRAINT "ingestion_events_bank_connection_id_fkey" FOREIGN KEY ("bank_connection_id") REFERENCES "bank_connections"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_institution_code_fkey" FOREIGN KEY ("institution_code") REFERENCES "financial_institutions"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "category_rules" ADD CONSTRAINT "category_rules_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
