import { SiteBrandingSchema, SiteMetadataSchema, type ExplorerFolder, type ExplorerMedia, type Site, type Upload } from "@fullstack-template/schema";
import type { ExplorerFolderRow, ExplorerMediaRow, SiteRow, UploadRow } from "../db/schema";
import { thumbnailContentUrl } from "./explorer/contentPaths";

export function toSite(row: SiteRow): Site {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    heroImageUrl: row.heroImageUrl,
    metadata: SiteMetadataSchema.parse(row.metadata),
    branding: SiteBrandingSchema.parse(row.branding),
    links: row.links,
    published: row.published,
    updatedAt: row.updatedAt.toISOString()
  };
}

export function toUpload(row: UploadRow): Upload {
  return {
    id: row.id,
    filename: row.filename,
    url: row.url,
    thumbnailUrl: row.thumbnailUrl,
    storageProvider: row.storageProvider,
    storageKey: row.storageKey,
    storageResourceType: row.storageResourceType,
    contentType: row.contentType,
    size: row.size,
    createdAt: row.createdAt.toISOString()
  };
}

export function toExplorerFolder(row: ExplorerFolderRow, counts: { folderCount?: number; itemCount?: number } = {}): ExplorerFolder {
  return {
    id: row.id,
    name: row.name,
    parentId: row.parentId,
    coverUrl: row.coverUrl,
    folderCount: counts.folderCount ?? 0,
    itemCount: counts.itemCount ?? 0,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

export function toExplorerMedia(row: ExplorerMediaRow): ExplorerMedia {
  const localVideoThumbnailUrl =
    row.storageProvider === "local" && row.storageResourceType === "video" && row.storageKey ? thumbnailContentUrl(row.storageKey) : "";

  return {
    id: row.id,
    name: row.name,
    contentType: row.contentType,
    createdAt: row.createdAt.toISOString(),
    duration: row.duration,
    favorite: row.favorite,
    folderId: row.folderId,
    height: row.height,
    previewUrl: localVideoThumbnailUrl || row.previewUrl || row.url,
    size: row.size,
    source: row.source,
    storageKey: row.storageKey,
    storageProvider: row.storageProvider,
    storageResourceType: row.storageResourceType,
    tags: row.tags,
    url: row.url,
    width: row.width
  };
}
