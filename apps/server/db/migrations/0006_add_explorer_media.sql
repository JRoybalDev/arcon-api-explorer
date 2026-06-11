CREATE TABLE IF NOT EXISTS "explorer_folders" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "parent_id" uuid,
  "cover_url" text DEFAULT '' NOT NULL,
  "storage_key" text DEFAULT '' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "explorer_folders"
ADD CONSTRAINT "explorer_folders_parent_id_explorer_folders_id_fk"
FOREIGN KEY ("parent_id") REFERENCES "explorer_folders"("id")
ON DELETE cascade;

CREATE TABLE IF NOT EXISTS "explorer_media" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "url" text NOT NULL,
  "preview_url" text DEFAULT '' NOT NULL,
  "content_type" text NOT NULL,
  "source" text DEFAULT 'upload' NOT NULL,
  "storage_provider" text DEFAULT 'local' NOT NULL,
  "storage_key" text DEFAULT '' NOT NULL,
  "storage_resource_type" text DEFAULT 'raw' NOT NULL,
  "size" integer DEFAULT 0 NOT NULL,
  "width" integer,
  "height" integer,
  "duration" integer,
  "favorite" boolean DEFAULT false NOT NULL,
  "folder_id" uuid,
  "tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "explorer_media"
ADD CONSTRAINT "explorer_media_folder_id_explorer_folders_id_fk"
FOREIGN KEY ("folder_id") REFERENCES "explorer_folders"("id")
ON DELETE set null;
