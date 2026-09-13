-- AlterTable
ALTER TABLE "beta_invites" ADD COLUMN "code" TEXT,
ADD COLUMN "source" TEXT,
ADD COLUMN "campaign_code" TEXT,
ADD COLUMN "referrer_profile_id" UUID,
ADD COLUMN "expires_at" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "beta_invites_code_key" ON "beta_invites"("code");

-- CreateTable
CREATE TABLE "beta_interests" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "source" TEXT DEFAULT 'LANDING_DIRECT',
    "campaign_code" TEXT,
    "referred_by" TEXT,
    "consented_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "beta_interests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "beta_interests_email_key" ON "beta_interests"("email");
CREATE INDEX "beta_interests_created_at_idx" ON "beta_interests"("created_at");

-- Row Level Security
ALTER TABLE "beta_interests" ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  app_role TEXT;
  app_table TEXT;
BEGIN
  FOREACH app_role IN ARRAY ARRAY['anon', 'authenticated']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = app_role) THEN
      FOREACH app_table IN ARRAY ARRAY[
        'beta_interests'
      ]
      LOOP
        EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE %I FROM %I', app_table, app_role);
      END LOOP;
    END IF;
  END LOOP;
END $$;
