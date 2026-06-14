import { and, eq, inArray, ne, sql } from "drizzle-orm";
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

type ScannedFolder = {
  name: string;
  parentPath: string;
  path: string;
};

type ScannedContent = {
  failedDirectories: number;
  folders: ScannedFolder[];
  media: ScannedMedia[];
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

async function scanContentDirectory(directory: string, root: string): Promise<ScannedContent> {
  let failedDirectories = 0;
  const entries = await readdir(directory, { withFileTypes: true }).catch((error) => {
    logger.warn("explorer.populate.read_failed", { directory, error });
    failedDirectories += 1;
    return [];
  });
  const folders: ScannedFolder[] = [];
  const media: ScannedMedia[] = [];

  for (const entry of entries) {
    const absolutePath = join(directory, entry.name);

    if (entry.isDirectory()) {
      if (!shouldIgnoreDirectory(entry.name)) {
        const relativePath = normalizeContentPath(absolutePath.substring(root.length));
        const parentPath = normalizeContentPath(posix.dirname(relativePath) === "." ? "" : posix.dirname(relativePath));
        folders.push({
          name: entry.name,
          parentPath,
          path: relativePath
        });

        const scanned = await scanContentDirectory(absolutePath, root);
        failedDirectories += scanned.failedDirectories;
        folders.push(...scanned.folders);
        media.push(...scanned.media);
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

  return { failedDirectories, folders, media };
}

async function syncFolders(scannedFolders: ScannedFolder[], options: { prune: boolean }) {
  const existing = await db.select().from(explorerFolders);
  const existingByPath = new Map(existing.map((folder) => [folder.storageKey, folder]));
  const synced = new Map<string, FolderRecord>();
  const sortedFolders = [...scannedFolders].sort((a, b) => a.path.split("/").length - b.path.split("/").length || a.path.localeCompare(b.path));

  for (const scannedFolder of sortedFolders) {
    const parentId = scannedFolder.parentPath ? synced.get(scannedFolder.parentPath)?.id ?? existingByPath.get(scannedFolder.parentPath)?.id ?? null : null;
    const existingFolder = existingByPath.get(scannedFolder.path);

    if (existingFolder) {
      const [folder] = await db
        .update(explorerFolders)
        .set({
          name: scannedFolder.name,
          parentId,
          updatedAt: new Date()
        })
        .where(eq(explorerFolders.id, existingFolder.id))
        .returning();
      synced.set(scannedFolder.path, { id: folder?.id ?? existingFolder.id, path: scannedFolder.path });
      continue;
    }

    const [folder] = await db
      .insert(explorerFolders)
      .values({
        name: scannedFolder.name,
        parentId,
        storageKey: scannedFolder.path
      })
      .returning();

    if (folder) {
      synced.set(scannedFolder.path, { id: folder.id, path: scannedFolder.path });
    }
  }

  if (options.prune) {
    const validPaths = new Set(scannedFolders.map((folder) => folder.path));
    const obsoleteFolderIds = existing
      .filter((folder) => folder.storageKey && !folder.storageKey.startsWith("fake-seed/") && !validPaths.has(folder.storageKey))
      .map((folder) => folder.id);

    if (obsoleteFolderIds.length > 0) {
      // delete in chunks to avoid excessively large parameter lists
      const CHUNK = 1000;
      for (let i = 0; i < obsoleteFolderIds.length; i += CHUNK) {
        const chunk = obsoleteFolderIds.slice(i, i + CHUNK);
        await db.delete(explorerFolders).where(inArray(explorerFolders.id, chunk));
      }
    }
  }

  return synced;
}

async function syncMedia(scannedMedia: ScannedMedia[], folders: Map<string, FolderRecord>, options: { prune: boolean }) {
  const existing = await db.select().from(explorerMedia).where(eq(explorerMedia.source, "indexed"));
  const existingByKey = new Map(existing.map((media) => [media.storageKey, media]));
  const processedKeys = new Set<string>();

  for (const item of scannedMedia) {
    const existingMedia = existingByKey.get(item.relativePath);
    const folderId = item.folderPath ? folders.get(item.folderPath)?.id ?? null : null;
    const values = {
      name: item.name,
      url: contentUrl(item.relativePath),
      previewUrl: thumbnailContentUrl(item.relativePath),
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

  if (options.prune) {
    const obsoleteIds = existing.filter((media) => !processedKeys.has(media.storageKey)).map((media) => media.id);
    if (obsoleteIds.length > 0) {
      // delete in chunks to avoid building a huge IN parameter list
      const CHUNK = 1000;
      for (let i = 0; i < obsoleteIds.length; i += CHUNK) {
        const chunk = obsoleteIds.slice(i, i + CHUNK);
        await db.delete(explorerMedia).where(and(eq(explorerMedia.source, "indexed"), inArray(explorerMedia.id, chunk)));
      }
    }
  }
}

export async function updateFolderCovers() {
  const [folders, mediaRows] = await Promise.all([
    db.select().from(explorerFolders),
    db
      .select()
      .from(explorerMedia)
      .where(sql`${explorerMedia.storageResourceType} in ('image', 'video')`)
  ]);
  const foldersById = new Map(folders.map((folder) => [folder.id, folder]));
  const coverByFolderId = new Map<string, string>();
  const newestImages = [...mediaRows].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  for (const media of newestImages) {
    let currentFolderId = media.folderId;

    while (currentFolderId) {
      if (!coverByFolderId.has(currentFolderId)) {
        coverByFolderId.set(currentFolderId, media.previewUrl || media.url);
      }

      currentFolderId = foldersById.get(currentFolderId)?.parentId ?? null;
    }
  }

  for (const folder of folders) {
    const coverUrl = coverByFolderId.get(folder.id) ?? "";
    await db
      .update(explorerFolders)
      .set({
        coverUrl,
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

    const scannedContent = await scanContentDirectory(env.contentRoot, env.contentRoot.replace(/\/+$/, ""));
    const shouldPrune = scannedContent.failedDirectories === 0;

    if (!shouldPrune) {
      logger.warn("explorer.populate.prune_skipped", {
        failedDirectories: scannedContent.failedDirectories
      });
    }

    const folders = await syncFolders(scannedContent.folders, { prune: shouldPrune });
    await syncMedia(scannedContent.media, folders, { prune: shouldPrune });
    await updateFolderCovers();

    logger.info("explorer.populate.completed", {
      durationMs: Date.now() - startedAt,
      failedDirectories: scannedContent.failedDirectories,
      files: scannedContent.media.length,
      folders: folders.size
    });
  })().finally(() => {
    populatePromise = null;
  });

  return populatePromise;
}

export async function unpopulateExplorerFromContentRoot() {
  logger.info("explorer.unpopulate.started");

  const deletedMedia = await db.delete(explorerMedia).where(eq(explorerMedia.source, "indexed")).returning({ id: explorerMedia.id });
  const deletedFolders = await db
    .delete(explorerFolders)
    .where(and(ne(explorerFolders.storageKey, ""), sql`${explorerFolders.storageKey} not like ${"fake-seed/%"}`))
    .returning({ id: explorerFolders.id });

  await updateFolderCovers();

  logger.info("explorer.unpopulate.completed", {
    folders: deletedFolders.length,
    media: deletedMedia.length
  });

  return {
    folders: deletedFolders.length,
    media: deletedMedia.length
  };
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
