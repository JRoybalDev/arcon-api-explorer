import {
  ExplorerCreateFolderInputSchema,
  ExplorerDeleteMediaInputSchema,
  ExplorerFavoriteInputSchema,
  ExplorerMoveMediaInputSchema,
  ExplorerRemoteMediaInputSchema,
  ExplorerTagsInputSchema
} from "@fullstack-template/schema";
import { and, asc, count, desc, eq, ilike, inArray, isNull, sql, type SQL } from "drizzle-orm";
import { Hono, type Context } from "hono";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, extname } from "node:path";
import { explorerFolders, explorerMedia } from "../../db/schema";
import { db } from "../db";
import { assertSafeContentPath, contentUrl, normalizeContentPath, thumbnailContentUrl } from "../explorer/contentPaths";
import { populateExplorerFromContentRoot, unpopulateExplorerFromContentRoot, updateFolderCovers } from "../explorer/populateExplorer";
import { deleteAndRegenerateContentThumbnails, generateMissingContentThumbnails } from "../explorer/thumbnailMaintenance";
import { fail, ok } from "../http/response";
import { logger } from "../logger";
import { toExplorerFolder, toExplorerMedia } from "../mappers";
import { requireAdminKey } from "../middleware/admin";
import type { AppVariables } from "../types";

export const explorerRoute = new Hono<{ Variables: AppVariables }>();

type ExplorerContext = Context<{ Variables: AppVariables }>;

async function fileFromRequest(c: ExplorerContext) {
  const form = await c.req.formData();
  const file = form.get("file");
  const rawFolderId = form.get("folderId");

  return {
    file: file instanceof File && file.size > 0 ? file : null,
    folderId: typeof rawFolderId === "string" && rawFolderId.length > 0 ? rawFolderId : null
  };
}

function optionalFolderId(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function boundedInteger(value: unknown, fallback: number, min: number, max: number) {
  const parsed = typeof value === "string" ? Number.parseInt(value, 10) : Number.NaN;

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, parsed));
}

function inferRemoteContentType(url: string) {
  const cleanUrl = url.split("?")[0]?.toLowerCase() ?? "";

  if (/\.(mp4|webm|mov|m4v|avi|mkv)$/.test(cleanUrl)) {
    return "video/mp4";
  }

  if (/\.(png)$/.test(cleanUrl)) {
    return "image/png";
  }

  if (/\.(gif)$/.test(cleanUrl)) {
    return "image/gif";
  }

  if (/\.(webp)$/.test(cleanUrl)) {
    return "image/webp";
  }

  return "image/jpeg";
}

function titleFromUrl(url: string) {
  const pathname = new URL(url).pathname;
  const filename = pathname.split("/").filter(Boolean).pop();
  return filename ? decodeURIComponent(filename) : url;
}

async function folderExists(folderId: string | null) {
  if (!folderId) {
    return true;
  }

  const [folder] = await db.select({ id: explorerFolders.id }).from(explorerFolders).where(eq(explorerFolders.id, folderId)).limit(1);
  return Boolean(folder);
}

async function folderPath(folderId: string | null) {
  if (!folderId) {
    return "";
  }

  const [folder] = await db.select().from(explorerFolders).where(eq(explorerFolders.id, folderId)).limit(1);
  return folder?.storageKey ?? "";
}

function safeFilename(name: string) {
  const extension = extname(name);
  const base = name
    .slice(0, extension ? -extension.length : undefined)
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return `${base || "media"}-${crypto.randomUUID()}${extension || ".bin"}`;
}

async function writeContentFile(file: File, folderId: string | null) {
  const parentPath = await folderPath(folderId);
  const relativePath = normalizeContentPath(`${parentPath}/${safeFilename(file.name)}`);
  const { absolutePath } = assertSafeContentPath(relativePath);

  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, Buffer.from(await file.arrayBuffer()));

  return {
    relativePath,
    url: contentUrl(relativePath)
  };
}

async function folderCounts(folderIds: string[]) {
  if (folderIds.length === 0) {
    return new Map<string, { folderCount: number; itemCount: number }>();
  }

  const counts = new Map(folderIds.map((folderId) => [folderId, { folderCount: 0, itemCount: 0 }]));
  const [folderRows, mediaRows] = await Promise.all([
    db.select({ id: explorerFolders.id, parentId: explorerFolders.parentId }).from(explorerFolders),
    db.select({ folderId: explorerMedia.folderId }).from(explorerMedia)
  ]);
  const childrenByParent = folderRows.reduce<Record<string, string[]>>((groups, folder) => {
    if (folder.parentId) {
      groups[folder.parentId] = [...(groups[folder.parentId] ?? []), folder.id];
    }

    return groups;
  }, {});
  const mediaCountByFolder = mediaRows.reduce<Record<string, number>>((groups, media) => {
    if (media.folderId) {
      groups[media.folderId] = (groups[media.folderId] ?? 0) + 1;
    }

    return groups;
  }, {});

  function collectDescendants(parentId: string) {
    const descendantIds: string[] = [];
    const pendingIds = [...(childrenByParent[parentId] ?? [])];

    while (pendingIds.length > 0) {
      const nextId = pendingIds.shift();
      if (!nextId) {
        continue;
      }

      descendantIds.push(nextId);
      pendingIds.push(...(childrenByParent[nextId] ?? []));
    }

    return descendantIds;
  }

  for (const folderId of folderIds) {
    const descendantIds = collectDescendants(folderId);
    const itemCount = [folderId, ...descendantIds].reduce((total, id) => total + (mediaCountByFolder[id] ?? 0), 0);
    counts.set(folderId, {
      folderCount: descendantIds.length,
      itemCount
    });
  }

  return counts;
}

async function descendantFolderIds(folderId: string) {
  const rows = await db.select({ id: explorerFolders.id, parentId: explorerFolders.parentId }).from(explorerFolders);
  const childrenByParent = rows.reduce<Record<string, string[]>>((groups, folder) => {
    if (folder.parentId) {
      groups[folder.parentId] = [...(groups[folder.parentId] ?? []), folder.id];
    }

    return groups;
  }, {});
  const descendantIds: string[] = [];
  const pendingIds = [...(childrenByParent[folderId] ?? [])];

  while (pendingIds.length > 0) {
    const nextId = pendingIds.shift();
    if (!nextId) {
      continue;
    }

    descendantIds.push(nextId);
    pendingIds.push(...(childrenByParent[nextId] ?? []));
  }

  return descendantIds;
}

async function latestFolderCoverUrls(folderIds: string[]) {
  if (folderIds.length === 0) {
    return new Map<string, string>();
  }

  const requestedFolderIds = new Set(folderIds);
  const [folderRows, mediaRows] = await Promise.all([
    db.select({ id: explorerFolders.id, parentId: explorerFolders.parentId }).from(explorerFolders),
    db
      .select({
        folderId: explorerMedia.folderId,
        previewUrl: explorerMedia.previewUrl,
        url: explorerMedia.url
      })
      .from(explorerMedia)
      .where(sql`${explorerMedia.storageResourceType} in ('image', 'video')`)
      .orderBy(desc(explorerMedia.createdAt))
  ]);
  const foldersById = new Map(folderRows.map((folder) => [folder.id, folder]));
  const coverUrls = new Map<string, string>();

  for (const media of mediaRows) {
    let currentFolderId = media.folderId;

    while (currentFolderId) {
      if (requestedFolderIds.has(currentFolderId) && !coverUrls.has(currentFolderId)) {
        coverUrls.set(currentFolderId, media.previewUrl || media.url);
      }

      currentFolderId = foldersById.get(currentFolderId)?.parentId ?? null;
    }

    if (coverUrls.size === requestedFolderIds.size) {
      break;
    }
  }

  return coverUrls;
}

explorerRoute.get("/contents", requireAdminKey, async (c) => {
  const folderId = optionalFolderId(c.req.query("folderId"));
  const filter = c.req.query("filter") ?? "all";
  const search = c.req.query("search")?.trim() ?? "";
  const sort = c.req.query("sort") ?? "newest";
  const shuffleSeed = c.req.query("shuffleSeed")?.trim() ?? "";
  const limit = boundedInteger(c.req.query("limit"), 120, 1, 240);
  const offset = boundedInteger(c.req.query("offset"), 0, 0, 100_000);

  const folderWhere = folderId ? eq(explorerFolders.parentId, folderId) : isNull(explorerFolders.parentId);
  const mediaWhere: SQL[] = [];

  if (filter === "mixed" && folderId) {
    mediaWhere.push(inArray(explorerMedia.folderId, [folderId, ...(await descendantFolderIds(folderId))]));
  } else if (folderId) {
    mediaWhere.push(eq(explorerMedia.folderId, folderId));
  }

  if (filter === "image" || filter === "video") {
    mediaWhere.push(ilike(explorerMedia.contentType, `${filter}/%`));
  }

  if (search) {
    const searchPattern = `%${search}%`;
    mediaWhere.push(sql`(${ilike(explorerMedia.name, searchPattern)} OR EXISTS (
      SELECT 1 FROM jsonb_array_elements_text(${explorerMedia.tags}) AS media_tag(value)
      WHERE media_tag.value ILIKE ${searchPattern}
    ))`);
  }

  const mediaOrder = shuffleSeed
    ? sql`md5(${explorerMedia.id}::text || ${shuffleSeed})`
    : sort === "oldest"
      ? asc(explorerMedia.createdAt)
      : sort === "name"
        ? asc(explorerMedia.name)
        : desc(explorerMedia.createdAt);
  const mediaCondition = mediaWhere.length > 0 ? and(...mediaWhere) : undefined;

  const [folderRows, mediaRows, mediaTotalRows] = await Promise.all([
    db.select().from(explorerFolders).where(folderWhere).orderBy(asc(explorerFolders.name)),
    db.select().from(explorerMedia).where(mediaCondition).orderBy(mediaOrder).limit(limit).offset(offset),
    db.select({ value: count() }).from(explorerMedia).where(mediaCondition)
  ]);
  const folderIds = folderRows.map((folder) => folder.id);
  const [counts, coverUrls] = await Promise.all([folderCounts(folderIds), latestFolderCoverUrls(folderIds)]);

  return ok(c, {
    folders: folderRows.map((folder) => toExplorerFolder({ ...folder, coverUrl: coverUrls.get(folder.id) ?? folder.coverUrl }, counts.get(folder.id))),
    media: mediaRows.map(toExplorerMedia),
    mediaLimit: limit,
    mediaOffset: offset,
    mediaTotal: mediaTotalRows[0]?.value ?? 0
  });
});

explorerRoute.get("/folders", requireAdminKey, async (c) => {
  const rows = await db.select().from(explorerFolders).orderBy(asc(explorerFolders.name));
  const folderIds = rows.map((folder) => folder.id);
  const [counts, coverUrls] = await Promise.all([folderCounts(folderIds), latestFolderCoverUrls(folderIds)]);
  return ok(c, rows.map((folder) => toExplorerFolder({ ...folder, coverUrl: coverUrls.get(folder.id) ?? folder.coverUrl }, counts.get(folder.id))));
});

explorerRoute.post("/folders", requireAdminKey, async (c) => {
  const parsed = ExplorerCreateFolderInputSchema.safeParse(await c.req.json().catch(() => null));

  if (!parsed.success) {
    return fail(c, "Invalid folder payload", 400, { code: "EXPLORER_FOLDER_INVALID", details: parsed.error.issues });
  }

  const parentId = parsed.data.parentId ?? null;

  if (!(await folderExists(parentId))) {
    return fail(c, "Parent folder not found", 404, { code: "EXPLORER_PARENT_FOLDER_NOT_FOUND" });
  }

  const parentPath = await folderPath(parentId);
  const storageKey = normalizeContentPath(`${parentPath}/${parsed.data.name.trim()}`);
  const { absolutePath } = assertSafeContentPath(storageKey);

  await mkdir(absolutePath, { recursive: true });

  const [folder] = await db
    .insert(explorerFolders)
    .values({
      name: parsed.data.name.trim(),
      parentId,
      storageKey
    })
    .returning();

  return ok(c, folder ? toExplorerFolder(folder) : null, 201);
});

explorerRoute.post("/media/upload", requireAdminKey, async (c) => {
  const { file, folderId } = await fileFromRequest(c);

  if (!file) {
    return fail(c, "Expected a file field", 400, { code: "EXPLORER_UPLOAD_FILE_REQUIRED" });
  }

  if (!(await folderExists(folderId))) {
    return fail(c, "Folder not found", 404, { code: "EXPLORER_FOLDER_NOT_FOUND" });
  }

  const stored = await writeContentFile(file, folderId);
  const [media] = await db
    .insert(explorerMedia)
    .values({
      name: file.name,
      url: stored.url,
      previewUrl: file.type.startsWith("image/") || file.type.startsWith("video/") ? thumbnailContentUrl(stored.relativePath) : stored.url,
      contentType: file.type || "application/octet-stream",
      source: "upload",
      storageProvider: "local",
      storageKey: stored.relativePath,
      storageResourceType: file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : "raw",
      size: file.size,
      folderId
    })
    .returning();

  if (!media) {
    return fail(c, "Media was not saved", 500, { code: "EXPLORER_MEDIA_SAVE_FAILED" });
  }

  await updateFolderCovers();

  return ok(c, toExplorerMedia(media), 201);
});

explorerRoute.post("/media/remote", requireAdminKey, async (c) => {
  const parsed = ExplorerRemoteMediaInputSchema.safeParse(await c.req.json().catch(() => null));

  if (!parsed.success) {
    return fail(c, "Invalid remote media payload", 400, { code: "EXPLORER_REMOTE_MEDIA_INVALID", details: parsed.error.issues });
  }

  const folderId = parsed.data.folderId ?? null;

  if (!(await folderExists(folderId))) {
    return fail(c, "Folder not found", 404, { code: "EXPLORER_FOLDER_NOT_FOUND" });
  }

  const rows = await db
    .insert(explorerMedia)
    .values(
      parsed.data.items.map((item) => ({
        name: item.title?.trim() || titleFromUrl(item.url),
        url: item.url,
        previewUrl: item.thumbnailUrl || item.url,
        contentType: inferRemoteContentType(item.url),
        source: "remote",
        storageProvider: "remote",
        storageResourceType: inferRemoteContentType(item.url).startsWith("video/") ? "video" : "image",
        size: 0,
        folderId,
        tags: item.tags ?? []
      }))
    )
    .returning();

  await updateFolderCovers();

  return ok(c, rows.map(toExplorerMedia), 201);
});

explorerRoute.post("/media/move", requireAdminKey, async (c) => {
  const parsed = ExplorerMoveMediaInputSchema.safeParse(await c.req.json().catch(() => null));

  if (!parsed.success) {
    return fail(c, "Invalid move payload", 400, { code: "EXPLORER_MOVE_INVALID", details: parsed.error.issues });
  }

  const folderId = parsed.data.folderId ?? null;

  if (!(await folderExists(folderId))) {
    return fail(c, "Folder not found", 404, { code: "EXPLORER_FOLDER_NOT_FOUND" });
  }

  const rows = await db
    .update(explorerMedia)
    .set({
      folderId,
      updatedAt: new Date()
    })
    .where(inArray(explorerMedia.id, parsed.data.mediaIds))
    .returning();

  await updateFolderCovers();

  return ok(c, rows.map(toExplorerMedia));
});

explorerRoute.delete("/media", requireAdminKey, async (c) => {
  const parsed = ExplorerDeleteMediaInputSchema.safeParse(await c.req.json().catch(() => null));

  if (!parsed.success) {
    return fail(c, "Invalid delete payload", 400, { code: "EXPLORER_DELETE_INVALID", details: parsed.error.issues });
  }

  const rows = await db.delete(explorerMedia).where(inArray(explorerMedia.id, parsed.data.mediaIds)).returning();

  await Promise.all(
    rows
      .filter((media) => media.storageProvider === "local" && media.storageKey)
      .map((media) => {
        const { absolutePath } = assertSafeContentPath(media.storageKey);
        return rm(absolutePath, { force: true });
      })
  );

  await updateFolderCovers();

  return ok(c, rows.map(toExplorerMedia));
});

explorerRoute.post("/populate", requireAdminKey, async (c) => {
  void populateExplorerFromContentRoot().catch((error) => logger.error("explorer.populate.manual_failed", { error }));
  return ok(c, { started: true });
});

explorerRoute.post("/unpopulate", requireAdminKey, async (c) => {
  const result = await unpopulateExplorerFromContentRoot();
  return ok(c, result);
});

explorerRoute.post("/thumbnails/missing", requireAdminKey, async (c) => {
  void generateMissingContentThumbnails().catch((error) => logger.error("explorer.thumbnails.missing_failed", { error }));
  return ok(c, { started: true });
});

explorerRoute.post("/thumbnails/regenerate", requireAdminKey, async (c) => {
  void deleteAndRegenerateContentThumbnails().catch((error) => logger.error("explorer.thumbnails.regenerate_failed", { error }));
  return ok(c, { started: true });
});

explorerRoute.post("/media/:id/favorite", requireAdminKey, async (c) => {
  const parsed = ExplorerFavoriteInputSchema.safeParse(await c.req.json().catch(() => null));

  if (!parsed.success) {
    return fail(c, "Invalid favorite payload", 400, { code: "EXPLORER_FAVORITE_INVALID", details: parsed.error.issues });
  }

  const [media] = await db
    .update(explorerMedia)
    .set({
      favorite: parsed.data.favorite,
      updatedAt: new Date()
    })
    .where(eq(explorerMedia.id, c.req.param("id")))
    .returning();

  if (!media) {
    return fail(c, "Media not found", 404, { code: "EXPLORER_MEDIA_NOT_FOUND" });
  }

  return ok(c, toExplorerMedia(media));
});

explorerRoute.post("/media/:id/tags", requireAdminKey, async (c) => {
  const parsed = ExplorerTagsInputSchema.safeParse(await c.req.json().catch(() => null));

  if (!parsed.success) {
    return fail(c, "Invalid tags payload", 400, { code: "EXPLORER_TAGS_INVALID", details: parsed.error.issues });
  }

  const tags = Array.from(new Set(parsed.data.tags.map((tag) => tag.trim()).filter(Boolean)));

  const [media] = await db
    .update(explorerMedia)
    .set({
      tags,
      updatedAt: new Date()
    })
    .where(eq(explorerMedia.id, c.req.param("id")))
    .returning();

  if (!media) {
    return fail(c, "Media not found", 404, { code: "EXPLORER_MEDIA_NOT_FOUND" });
  }

  return ok(c, toExplorerMedia(media));
});
