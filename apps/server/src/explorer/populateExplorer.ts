import { and, eq, inArray } from "drizzle-orm";
import { createHash } from "node:crypto";
import { readdir, stat } from "node:fs/promises";
import { extname, join, posix } from "node:path";
import { explorerFolders, explorerMedia } from "../../db/schema";
import { db } from "../db";
import { env } from "../env";
import { logger } from "../logger";
import { contentUrl, imageExtensions, normalizeContentPath, shouldIgnoreDirectory, thumbnailContentUrl, videoExtensions } from "./contentPaths";

type ScannedMedia = {
  absolutePath: string;
  contentType: string;
  createdAt: Date;
  folderPath: string;
  name: string;
  relativePath: string;
  size: number;
  storageResourceType: "image" | "video";
};

type FolderRecord = {
  id: string;
  path: string;
};

let populatePromise: Promise<void> | null = null;

function contentTypeFor(name: string) {
  const extension = extname(name).toLowerCase();

  if (extension === ".png") return "image/png";
  if (extension === ".gif") return "image/gif";
  if (extension === ".webp") return "image/webp";
  if (imageExtensions.has(extension)) return "image/jpeg";
  if (extension === ".webm") return "video/webm";
  if (extension === ".mov") return "video/quicktime";
  if (videoExtensions.has(extension)) return "video/mp4";
  return "";
}

async function hashPath(value: string) {
  return createHash("sha1").update(value).digest("hex");
}

async function scanContentDirectory(directory: string, root: string): Promise<ScannedMedia[]> {
  const entries = await readdir(directory, { withFileTypes: true }).catch((error) => {
    logger.warn("explorer.populate.read_failed", { directory, error });
    return [];
  });
  const media: ScannedMedia[] = [];

  for (const entry of entries) {
    const absolutePath = join(directory, entry.name);

    if (entry.isDirectory()) {
      if (!shouldIgnoreDirectory(entry.name)) {
        media.push(...(await scanContentDirectory(absolutePath, root)));
      }
      continue;
    }

    if (!entry.isFile() || entry.name.startsWith("thumb_")) {
      continue;
    }

    const extension = extname(entry.name).toLowerCase();
    const storageResourceType = imageExtensions.has(extension) ? "image" : videoExtensions.has(extension) ? "video" : null;

    if (!storageResourceType) {
      continue;
    }

    const stats = await stat(absolutePath).catch(() => null);
    if (!stats) {
      continue;
    }

    const relativePath = normalizeContentPath(absolutePath.substring(root.length));
    const folderPath = normalizeContentPath(posix.dirname(relativePath) === "." ? "" : posix.dirname(relativePath));

    media.push({
      absolutePath,
      contentType: contentTypeFor(entry.name),
      createdAt: stats.birthtime.getFullYear() > 2000 ? stats.birthtime : stats.mtime,
      folderPath,
      name: entry.name,
      relativePath,
      size: stats.size,
      storageResourceType
    });
  }

  return media;
}

function folderPathsFor(media: ScannedMedia[]) {
  const paths = new Set<string>();

  media.forEach((item) => {
    if (!item.folderPath) {
      return;
    }

    const parts = item.folderPath.split("/").filter(Boolean);
    for (let index = 0; index < parts.length; index += 1) {
      paths.add(parts.slice(0, index + 1).join("/"));
    }
  });

  return Array.from(paths).sort((a, b) => a.split("/").length - b.split("/").length || a.localeCompare(b));
}

async function syncFolders(media: ScannedMedia[]) {
  const existing = await db.select().from(explorerFolders);
  const existingByPath = new Map(existing.map((folder) => [folder.storageKey, folder]));
  const synced = new Map<string, FolderRecord>();

  for (const folderPath of folderPathsFor(media)) {
    const name = folderPath.split("/").pop() ?? folderPath;
    const parentPath = folderPath.includes("/") ? folderPath.substring(0, folderPath.lastIndexOf("/")) : "";
    const parentId = parentPath ? synced.get(parentPath)?.id ?? existingByPath.get(parentPath)?.id ?? null : null;
    const existingFolder = existingByPath.get(folderPath);

    if (existingFolder) {
      const [folder] = await db
        .update(explorerFolders)
        .set({
          name,
          parentId,
          updatedAt: new Date()
        })
        .where(eq(explorerFolders.id, existingFolder.id))
        .returning();
      synced.set(folderPath, { id: folder?.id ?? existingFolder.id, path: folderPath });
      continue;
    }

    const [folder] = await db
      .insert(explorerFolders)
      .values({
        name,
        parentId,
        storageKey: folderPath
      })
      .returning();

    if (folder) {
      synced.set(folderPath, { id: folder.id, path: folderPath });
    }
  }

  const validPaths = new Set(folderPathsFor(media));
  const obsoleteFolderIds = existing.filter((folder) => folder.storageKey && !validPaths.has(folder.storageKey)).map((folder) => folder.id);

  if (obsoleteFolderIds.length > 0) {
    await db.delete(explorerFolders).where(inArray(explorerFolders.id, obsoleteFolderIds));
  }

  return synced;
}

async function syncMedia(scannedMedia: ScannedMedia[], folders: Map<string, FolderRecord>) {
  const existing = await db.select().from(explorerMedia).where(eq(explorerMedia.source, "indexed"));
  const existingByKey = new Map(existing.map((media) => [media.storageKey, media]));
  const processedKeys = new Set<string>();

  for (const item of scannedMedia) {
    const existingMedia = existingByKey.get(item.relativePath);
    const folderId = item.folderPath ? folders.get(item.folderPath)?.id ?? null : null;
    const values = {
      name: item.name,
      url: contentUrl(item.relativePath),
      previewUrl: item.storageResourceType === "image" ? thumbnailContentUrl(item.relativePath) : contentUrl(item.relativePath),
      contentType: item.contentType,
      source: "indexed",
      storageProvider: "local",
      storageKey: item.relativePath,
      storageResourceType: item.storageResourceType,
      size: item.size,
      folderId,
      updatedAt: new Date()
    };

    processedKeys.add(item.relativePath);

    if (existingMedia) {
      await db.update(explorerMedia).set(values).where(eq(explorerMedia.id, existingMedia.id));
      continue;
    }

    await db.insert(explorerMedia).values({
      ...values,
      createdAt: item.createdAt
    });
  }

  const obsoleteIds = existing.filter((media) => !processedKeys.has(media.storageKey)).map((media) => media.id);
  if (obsoleteIds.length > 0) {
    await db.delete(explorerMedia).where(and(eq(explorerMedia.source, "indexed"), inArray(explorerMedia.id, obsoleteIds)));
  }
}

async function updateFolderCovers() {
  const folders = await db.select().from(explorerFolders);

  for (const folder of folders) {
    const [cover] = await db.select().from(explorerMedia).where(eq(explorerMedia.folderId, folder.id)).limit(1);
    await db
      .update(explorerFolders)
      .set({
        coverUrl: cover?.previewUrl || "",
        updatedAt: new Date()
      })
      .where(eq(explorerFolders.id, folder.id));
  }
}

export async function populateExplorerFromContentRoot() {
  if (populatePromise) {
    return populatePromise;
  }

  populatePromise = (async () => {
    const startedAt = Date.now();
    logger.info("explorer.populate.started", {
      contentRoot: env.contentRoot
    });

    const scannedMedia = await scanContentDirectory(env.contentRoot, env.contentRoot.replace(/\/+$/, ""));
    const folders = await syncFolders(scannedMedia);
    await syncMedia(scannedMedia, folders);
    await updateFolderCovers();

    logger.info("explorer.populate.completed", {
      durationMs: Date.now() - startedAt,
      files: scannedMedia.length,
      folders: folders.size
    });
  })().finally(() => {
    populatePromise = null;
  });

  return populatePromise;
}

export function startExplorerPopulationSchedule() {
  if (!env.autoPopulateExplorer) {
    logger.info("explorer.populate.disabled");
    return;
  }

  if (env.populateExplorerOnStartup) {
    void populateExplorerFromContentRoot().catch((error) => logger.error("explorer.populate.startup_failed", { error }));
  }

  setInterval(() => {
    void populateExplorerFromContentRoot().catch((error) => logger.error("explorer.populate.scheduled_failed", { error }));
  }, env.populateExplorerIntervalMs);
}
