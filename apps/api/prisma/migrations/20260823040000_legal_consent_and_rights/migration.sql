CREATE TYPE "LegalDocumentType" AS ENUM ('TERMS', 'PRIVACY', 'GOOGLE_API_DISCLOSURE', 'DATA_DELETION');
CREATE TYPE "LegalAcceptanceSource" AS ENUM ('SIGNUP', 'RECONSENT', 'SETTINGS');

CREATE TABLE "legal_documents" (
    "id" UUID NOT NULL,
    "type" "LegalDocumentType" NOT NULL,
    "version" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'es-DO',
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content_hash" TEXT NOT NULL,
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "effective_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "legal_documents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "legal_acceptances" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "legal_document_id" UUID NOT NULL,
    "source" "LegalAcceptanceSource" NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'es-DO',
    "ip_hash" TEXT,
    "user_agent_hash" TEXT,
    "accepted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "legal_acceptances_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "integration_consents" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "inbox_connection_id" UUID NOT NULL,
    "provider" "InboxProvider" NOT NULL,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "disclosure_version" TEXT NOT NULL,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "integration_consents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "account_deletion_audits" (
    "id" UUID NOT NULL,
    "subject_hash" TEXT NOT NULL,
    "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "account_deletion_audits_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "legal_documents_type_version_locale_key"
  ON "legal_documents"("type", "version", "locale");
CREATE INDEX "legal_documents_type_locale_is_current_idx"
  ON "legal_documents"("type", "locale", "is_current");
CREATE UNIQUE INDEX "legal_acceptances_profile_id_legal_document_id_key"
  ON "legal_acceptances"("profile_id", "legal_document_id");
CREATE INDEX "legal_acceptances_profile_id_accepted_at_idx"
  ON "legal_acceptances"("profile_id", "accepted_at");
CREATE INDEX "integration_consents_profile_id_granted_at_idx"
  ON "integration_consents"("profile_id", "granted_at");
CREATE INDEX "integration_consents_inbox_connection_id_granted_at_idx"
  ON "integration_consents"("inbox_connection_id", "granted_at");
CREATE INDEX "account_deletion_audits_completed_at_idx"
  ON "account_deletion_audits"("completed_at");

ALTER TABLE "legal_acceptances"
  ADD CONSTRAINT "legal_acceptances_profile_id_fkey"
  FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "legal_acceptances"
  ADD CONSTRAINT "legal_acceptances_legal_document_id_fkey"
  FOREIGN KEY ("legal_document_id") REFERENCES "legal_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "integration_consents"
  ADD CONSTRAINT "integration_consents_profile_id_fkey"
  FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "integration_consents"
  ADD CONSTRAINT "integration_consents_inbox_connection_id_fkey"
  FOREIGN KEY ("inbox_connection_id") REFERENCES "inbox_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "legal_documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "legal_acceptances" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "integration_consents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "account_deletion_audits" ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  app_role TEXT;
  app_table TEXT;
BEGIN
  FOREACH app_role IN ARRAY ARRAY['anon', 'authenticated']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = app_role) THEN
      FOREACH app_table IN ARRAY ARRAY[
        'legal_documents',
        'legal_acceptances',
        'integration_consents',
        'account_deletion_audits'
      ]
      LOOP
        EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE %I FROM %I', app_table, app_role);
      END LOOP;
    END IF;
  END LOOP;
END $$;
