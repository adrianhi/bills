ALTER TABLE "profiles"
  ADD COLUMN "product_guide_version_seen" TEXT,
  ADD COLUMN "product_guide_completed_version" TEXT,
  ADD COLUMN "product_guide_completed_at" TIMESTAMP(3);
