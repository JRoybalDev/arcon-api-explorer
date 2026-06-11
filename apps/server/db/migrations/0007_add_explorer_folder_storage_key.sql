ALTER TABLE "explorer_folders"
ADD COLUMN IF NOT EXISTS "storage_key" text DEFAULT '' NOT NULL;
