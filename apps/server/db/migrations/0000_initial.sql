CREATE TABLE IF NOT EXISTS "sites" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" text NOT NULL,
  "title" text NOT NULL,
  "description" text DEFAULT '' NOT NULL,
  "hero_image_url" text DEFAULT '' NOT NULL,
  "links" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "published" boolean DEFAULT false NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "sites_slug_unique" UNIQUE("slug")
);

CREATE TABLE IF NOT EXISTS "uploads" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "filename" text NOT NULL,
  "url" text NOT NULL,
  "content_type" text NOT NULL,
  "size" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
