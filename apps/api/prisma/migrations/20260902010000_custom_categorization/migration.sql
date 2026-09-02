BEGIN;
ALTER TABLE transactions
  ADD COLUMN merchant_key TEXT,
  ADD COLUMN merchant_identity_label TEXT,
  ADD COLUMN category_origin TEXT NOT NULL DEFAULT 'LEGACY_UNKNOWN',
  ADD COLUMN merchant_origin TEXT NOT NULL DEFAULT 'LEGACY_UNKNOWN',
  ADD COLUMN category_rule_id TEXT,
  ADD COLUMN merchant_rule_id TEXT,
  ADD COLUMN classification_version INTEGER NOT NULL DEFAULT 0;

ALTER TABLE category_rules
  ALTER COLUMN normalized_merchant DROP NOT NULL,
  ADD COLUMN match_type TEXT NOT NULL DEFAULT 'CONTAINS',
  ADD COLUMN target_key TEXT,
  ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
-- Same NFD/accent/whitespace folding as the domain. Do not reinterpret old aliases.
UPDATE category_rules SET target_key = lower(regexp_replace(
  btrim(regexp_replace(normalize(pattern, NFD), U&'[\0300-\036f]', '', 'g')), '\s+', ' ', 'g'));
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM category_rules WHERE workspace_id IS NOT NULL
    GROUP BY workspace_id, match_type, target_key HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'CATEGORY_RULE_NORMALIZATION_COLLISION: resolve duplicate normalized patterns before retrying';
  END IF;
END $$;
ALTER TABLE category_rules ALTER COLUMN target_key SET NOT NULL;
DROP INDEX category_rules_workspace_id_pattern_key;
CREATE UNIQUE INDEX category_rules_workspace_id_match_type_target_key_key
  ON category_rules(workspace_id, match_type, target_key);

CREATE TABLE rule_applications (
  id UUID PRIMARY KEY, workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  rule_id TEXT NOT NULL, phase TEXT NOT NULL DEFAULT 'PREVIEW', status TEXT NOT NULL DEFAULT 'QUEUED',
  include_unknown BOOLEAN NOT NULL DEFAULT false, start_date TIMESTAMP(3), end_date TIMESTAMP(3),
  cutoff TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, rules_snapshot JSONB NOT NULL,
  fingerprint TEXT NOT NULL, cursor TEXT, scanned INTEGER NOT NULL DEFAULT 0,
  matched INTEGER NOT NULL DEFAULT 0, changes INTEGER NOT NULL DEFAULT 0,
  category_changes INTEGER NOT NULL DEFAULT 0, merchant_changes INTEGER NOT NULL DEFAULT 0,
  protected_manual INTEGER NOT NULL DEFAULT 0, protected_unknown INTEGER NOT NULL DEFAULT 0,
  other_rule INTEGER NOT NULL DEFAULT 0, applied INTEGER NOT NULL DEFAULT 0, skipped INTEGER NOT NULL DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 0, lease_token TEXT, lease_until TIMESTAMP(3),
  next_attempt_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, error_code TEXT,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP(3) NOT NULL
);
CREATE INDEX rule_applications_status_next_attempt_at_idx ON rule_applications(status, next_attempt_at);
CREATE INDEX rule_applications_workspace_id_created_at_idx ON rule_applications(workspace_id, created_at);
CREATE UNIQUE INDEX rule_applications_one_active_workspace ON rule_applications(workspace_id)
  WHERE status IN ('QUEUED', 'PROCESSING');
CREATE TABLE rule_application_items (
  id UUID PRIMARY KEY, application_id UUID NOT NULL REFERENCES rule_applications(id) ON DELETE CASCADE,
  transaction_id TEXT NOT NULL, version INTEGER NOT NULL, before JSONB NOT NULL, after JSONB NOT NULL,
  reason TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'PENDING', applied_at TIMESTAMP(3)
);
CREATE UNIQUE INDEX rule_application_items_application_id_transaction_id_key
  ON rule_application_items(application_id, transaction_id);
CREATE INDEX rule_application_items_application_id_status_id_idx ON rule_application_items(application_id, status, id);
ALTER TABLE rule_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE rule_application_items ENABLE ROW LEVEL SECURITY;
DO $$ DECLARE role_name TEXT; table_name TEXT; BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      FOREACH table_name IN ARRAY ARRAY['rule_applications', 'rule_application_items'] LOOP
        EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE %I FROM %I', table_name, role_name);
      END LOOP;
    END IF;
  END LOOP;
END $$;
COMMIT;
