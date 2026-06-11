import { boolean, integer, jsonb, pgTable, text, timestamp, uuid, type AnyPgColumn } from "drizzle-orm/pg-core";
import { defaultSiteBranding, defaultSiteMetadata, type SiteBranding } from "@fullstack-template/schema";

export const sites = pgTable("sites", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  heroImageUrl: text("hero_image_url").notNull().default(""),
  metadata: jsonb("metadata")
    .$type<{ tabTitle: string; seoTitle: string; seoDescription: string; faviconUrl: string; ogImageUrl: string; frontendAsideMode: "scroll" | "static" }>()
    .notNull()
    .default(defaultSiteMetadata),
  branding: jsonb("branding")
    .$type<SiteBranding>()
    .notNull()
    .default(defaultSiteBranding),
  links: jsonb("links").$type<Array<{ label: string; href: string; kind: "primary" | "secondary" | "social" }>>().notNull().default([]),
  published: boolean("published").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const uploads = pgTable("uploads", {
  id: uuid("id").primaryKey().defaultRandom(),
  filename: text("filename").notNull(),
  url: text("url").notNull(),
  thumbnailUrl: text("thumbnail_url").notNull().default(""),
  storageProvider: text("storage_provider").notNull().default("local"),
  storageKey: text("storage_key").notNull().default(""),
  storageResourceType: text("storage_resource_type").notNull().default("raw"),
  contentType: text("content_type").notNull(),
  size: integer("size").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const explorerFolders = pgTable("explorer_folders", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  parentId: uuid("parent_id").references((): AnyPgColumn => explorerFolders.id, { onDelete: "cascade" }),
  coverUrl: text("cover_url").notNull().default(""),
  storageKey: text("storage_key").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const explorerMedia = pgTable("explorer_media", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  previewUrl: text("preview_url").notNull().default(""),
  contentType: text("content_type").notNull(),
  source: text("source").notNull().default("upload"),
  storageProvider: text("storage_provider").notNull().default("local"),
  storageKey: text("storage_key").notNull().default(""),
  storageResourceType: text("storage_resource_type").notNull().default("raw"),
  size: integer("size").notNull().default(0),
  width: integer("width"),
  height: integer("height"),
  duration: integer("duration"),
  favorite: boolean("favorite").notNull().default(false),
  folderId: uuid("folder_id").references(() => explorerFolders.id, { onDelete: "set null" }),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  role: text("role").notNull().default("user"),
  banned: boolean("banned").notNull().default(false),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull()
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  impersonatedBy: text("impersonated_by"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" })
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull()
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true })
});

export type SiteRow = typeof sites.$inferSelect;
export type NewSiteRow = typeof sites.$inferInsert;
export type UploadRow = typeof uploads.$inferSelect;
export type ExplorerFolderRow = typeof explorerFolders.$inferSelect;
export type ExplorerMediaRow = typeof explorerMedia.$inferSelect;
