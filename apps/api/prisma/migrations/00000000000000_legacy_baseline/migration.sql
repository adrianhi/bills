-- Baseline for new installations. Existing installations must mark this migration
-- as applied before running the SaaS foundation migration:
-- npx prisma migrate resolve --applied 00000000000000_legacy_baseline

CREATE SCHEMA IF NOT EXISTS "public";

CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "card_last_4" TEXT,
    "card_type" TEXT,
    "raw_merchant" TEXT NOT NULL,
    "merchant" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'DOP',
    "status" TEXT NOT NULL DEFAULT 'Aprobada',
    "transaction_type" TEXT NOT NULL DEFAULT 'Compra',
    "transaction_date" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'BHD_EMAIL',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "category_rules" (
    "id" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "normalized_merchant" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "category_rules_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "transactions_external_id_key" ON "transactions"("external_id");
CREATE INDEX "transactions_transaction_date_idx" ON "transactions"("transaction_date");
CREATE INDEX "transactions_category_idx" ON "transactions"("category");
CREATE INDEX "transactions_currency_idx" ON "transactions"("currency");
CREATE INDEX "transactions_merchant_idx" ON "transactions"("merchant");
CREATE UNIQUE INDEX "category_rules_pattern_key" ON "category_rules"("pattern");
