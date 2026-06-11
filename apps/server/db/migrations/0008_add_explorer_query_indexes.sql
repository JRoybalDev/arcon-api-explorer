CREATE INDEX IF NOT EXISTS "explorer_folders_parent_id_idx" ON "explorer_folders" ("parent_id");
CREATE INDEX IF NOT EXISTS "explorer_folders_storage_key_idx" ON "explorer_folders" ("storage_key");
CREATE INDEX IF NOT EXISTS "explorer_media_folder_id_idx" ON "explorer_media" ("folder_id");
CREATE INDEX IF NOT EXISTS "explorer_media_created_at_idx" ON "explorer_media" ("created_at");
CREATE INDEX IF NOT EXISTS "explorer_media_name_idx" ON "explorer_media" ("name");
CREATE INDEX IF NOT EXISTS "explorer_media_content_type_idx" ON "explorer_media" ("content_type");
CREATE INDEX IF NOT EXISTS "explorer_media_source_idx" ON "explorer_media" ("source");
CREATE INDEX IF NOT EXISTS "explorer_media_storage_key_idx" ON "explorer_media" ("storage_key");
