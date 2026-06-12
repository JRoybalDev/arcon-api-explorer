import type { ExplorerFolder as ApiExplorerFolder, ExplorerMedia } from "@fullstack-template/schema";

export type ExplorerFilter = "all" | "image" | "video" | "mixed";
export type ExplorerSort = "newest" | "oldest" | "name";
export type ExplorerView = "small" | "medium" | "large" | "list";

export type ExplorerFolder = {
  id: string;
  name: string;
  count: number;
  folderCount?: number;
  itemCount?: number;
  parentId: string | null;
  coverUrl: string;
};

export type ExplorerFile = {
  id: string;
  name: string;
  contentType: string;
  createdAt: string;
  folderId: string | null;
  height?: number;
  favorite?: boolean;
  previewUrl: string;
  size: number;
  source?: string;
  tags?: string[];
  url: string;
  width?: number;
};

export function apiFolderToExplorerFolder(folder: ApiExplorerFolder, count = 0): ExplorerFolder {
  return {
    id: folder.id,
    name: folder.name,
    count: count || folder.itemCount,
    folderCount: folder.folderCount,
    itemCount: folder.itemCount,
    parentId: folder.parentId,
    coverUrl: folder.coverUrl
  };
}

export function apiMediaToExplorerFile(media: ExplorerMedia): ExplorerFile {
  return {
    id: media.id,
    name: media.name,
    contentType: media.contentType,
    createdAt: media.createdAt,
    favorite: media.favorite,
    folderId: media.folderId,
    height: media.height ?? undefined,
    previewUrl: media.previewUrl || media.url,
    size: media.size,
    source: media.source,
    tags: media.tags,
    url: media.url,
    width: media.width ?? undefined
  };
}

export function isLikelyVideoUrl(url: string) {
  const cleanUrl = url.split("?")[0]?.toLowerCase() ?? "";
  if (cleanUrl.includes("/content-thumbnails/")) {
    return false;
  }

  return /\.(mp4|webm|mov|m4v|avi|mkv|flv|wmv|3gp|ts)$/.test(cleanUrl);
}

export function mediaThumbnailUrl(file: Pick<ExplorerFile, "contentType" | "previewUrl" | "url">) {
  if (!file.previewUrl) {
    return "";
  }

  if (!file.contentType.startsWith("video/")) {
    return file.previewUrl;
  }

  if (file.previewUrl === file.url) {
    return "";
  }

  return isLikelyVideoUrl(file.previewUrl) ? "" : file.previewUrl;
}

export function folderThumbnailUrl(url: string) {
  return isLikelyVideoUrl(url) ? "" : url;
}
