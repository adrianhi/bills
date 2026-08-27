-- bills. is accessed through the Express API, not Supabase Data API.
-- Keep public-schema tables inaccessible to anon/authenticated tokens even if
-- the Supabase project's default grants expose newly-created tables.

ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workspaces" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workspace_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "financial_institutions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bank_connections" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ingestion_addresses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ingestion_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "beta_invites" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "transactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "category_rules" ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  app_role TEXT;
  app_table TEXT;
BEGIN
  FOREACH app_role IN ARRAY ARRAY['anon', 'authenticated']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = app_role) THEN
      FOREACH app_table IN ARRAY ARRAY[
        'profiles',
        'workspaces',
        'workspace_members',
        'financial_institutions',
        'bank_connections',
        'ingestion_addresses',
        'ingestion_events',
        'beta_invites',
        'transactions',
        'category_rules'
      ]
      LOOP
        EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE %I FROM %I', app_table, app_role);
      END LOOP;
    END IF;
  END LOOP;
END $$;
