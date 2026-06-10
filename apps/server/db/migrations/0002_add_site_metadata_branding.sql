ALTER TABLE "sites"
ADD COLUMN IF NOT EXISTS "metadata" jsonb DEFAULT '{"tabTitle":"","seoTitle":"","seoDescription":"","faviconUrl":"","ogImageUrl":""}'::jsonb NOT NULL;

ALTER TABLE "sites"
ADD COLUMN IF NOT EXISTS "branding" jsonb DEFAULT '{"backgroundColor":"#f7f7f2","surfaceColor":"#ffffff","textColor":"#18212f","headingColor":"#101828","accentColor":"#006d77"}'::jsonb NOT NULL;
