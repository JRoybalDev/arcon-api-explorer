import { resolve, sep } from "node:path";
import { env } from "../env";

const ignoredDirectories = new Set(["$RECYCLE.BIN", "System Volume Information", "Recovery", "Config.Msi", "thumbnails", ".thumbnails", "thumbs", ".thumbs", "NeedToSort"]);
export const thumbnailCacheDirectories = [".arcon-thumbnails", ".arcon_thumbnails"] as const;

export const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".tiff"]);
export const videoExtensions = new Set([".mp4", ".webm", ".mov", ".avi", ".mkv", ".flv", ".wmv", ".m4v", ".3gp", ".ts"]);

export function shouldIgnoreDirectory(name: string) {
  return name.startsWith(".") || ignoredDirectories.has(name) || thumbnailCacheDirectories.includes(name as (typeof thumbnailCacheDirectories)[number]);
}

export function normalizeContentPath(pathname: string) {
  return pathname
    .replace(/\\/g, "/")
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean)
    .join("/");
}

export function assertSafeContentPath(pathname: string) {
  const normalized = normalizeContentPath(pathname);

  if (!normalized || normalized.includes("..")) {
    throw new Error("Unsafe content path");
  }

  const root = resolve(env.contentRoot);
  const absolutePath = resolve(root, normalized);
  const rootWithSeparator = root.endsWith(sep) ? root : `${root}${sep}`;

  if (absolutePath !== root && !absolutePath.startsWith(rootWithSeparator)) {
    throw new Error("Unsafe content path");
  }

  return {
    absolutePath,
    normalized
  };
}

export function contentUrl(relativePath: string) {
  return `/content/${normalizeContentPath(relativePath).split("/").map(encodeURIComponent).join("/")}`;
}

export function thumbnailContentUrl(relativePath: string) {
  return `/content-thumbnails/${normalizeContentPath(relativePath).split("/").map(encodeURIComponent).join("/")}`;
}

export function thumbnailCachePath(relativePath: string, directory = thumbnailCacheDirectories[0]) {
  return normalizeContentPath(`${directory}/${relativePath}.w720.webp`);
}
