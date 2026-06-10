ALTER TABLE "uploads"
ADD COLUMN IF NOT EXISTS "thumbnail_url" text DEFAULT '' NOT NULL;
