ALTER TABLE "uploads"
ADD COLUMN IF NOT EXISTS "storage_provider" text DEFAULT 'local' NOT NULL;

ALTER TABLE "uploads"
ADD COLUMN IF NOT EXISTS "storage_key" text DEFAULT '' NOT NULL;

ALTER TABLE "uploads"
ADD COLUMN IF NOT EXISTS "storage_resource_type" text DEFAULT 'raw' NOT NULL;
