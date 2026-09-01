CREATE TYPE "BudgetScope" AS ENUM ('GLOBAL', 'CATEGORY');
CREATE TYPE "BudgetLimitKind" AS ENUM ('RECURRING', 'MONTH_OVERRIDE');

CREATE TABLE "spending_budget_limits" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "currency" TEXT NOT NULL,
    "scope" "BudgetScope" NOT NULL,
    "target_key" TEXT NOT NULL,
    "category_key" TEXT,
    "category_label" TEXT,
    "kind" "BudgetLimitKind" NOT NULL,
    "effective_month" DATE NOT NULL,
    "amount" DECIMAL(12,2),
    "disabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "spending_budget_limits_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "spending_budget_limits_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "spending_budget_limits_target_shape_check" CHECK (
      ("scope" = 'GLOBAL' AND "target_key" = 'global' AND "category_key" IS NULL AND "category_label" IS NULL)
      OR
      ("scope" = 'CATEGORY' AND "category_key" IS NOT NULL AND "category_label" IS NOT NULL)
    ),
    CONSTRAINT "spending_budget_limits_amount_check" CHECK (
      ("disabled" = true AND "amount" IS NULL)
      OR
      ("disabled" = false AND "amount" > 0)
    )
);

CREATE UNIQUE INDEX "spending_budget_limits_workspace_currency_target_kind_month_key"
  ON "spending_budget_limits"("workspace_id", "currency", "target_key", "kind", "effective_month");
CREATE INDEX "spending_budget_limits_workspace_currency_month_idx"
  ON "spending_budget_limits"("workspace_id", "currency", "effective_month");

ALTER TABLE "spending_budget_limits" ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE app_role TEXT;
BEGIN
  FOREACH app_role IN ARRAY ARRAY['anon', 'authenticated']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = app_role) THEN
      EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE %I FROM %I', 'spending_budget_limits', app_role);
    END IF;
  END LOOP;
END $$;
