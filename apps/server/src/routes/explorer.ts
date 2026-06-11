import {
  ExplorerCreateFolderInputSchema,
  ExplorerDeleteMediaInputSchema,
  ExplorerFavoriteInputSchema,
  ExplorerMoveMediaInputSchema,
  ExplorerRemoteMediaInputSchema
} from "@fullstack-template/schema";
import { and, asc, count, desc, eq, ilike, inArray, isNull, type SQL } from "drizzle-orm";
import { Hono, type Context } from "hono";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, extname } from "node:path";
import { explorerFolders, explorerMedia } from "../../db/schema";
import { db } from "../db";
import { assertSafeContentPath, contentUrl, normalizeContentPath, thumbnailContentUrl } from "../explorer/contentPaths";
import { populateExplorerFromContentRoot } from "../explorer/populateExplorer";
import { fail, ok } from "../http/response";
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
  const [folderCountRows, itemCountRows] = await Promise.all([
    db
      .select({ parentId: explorerFolders.parentId, value: count() })
      .from(explorerFolders)
      .where(inArray(explorerFolders.parentId, folderIds))
      .groupBy(explorerFolders.parentId),
    db
      .select({ folderId: explorerMedia.folderId, value: count() })
      .from(explorerMedia)
      .where(inArray(explorerMedia.folderId, folderIds))
      .groupBy(explorerMedia.folderId)
  ]);

  for (const row of folderCountRows) {
    if (row.parentId) {
      counts.get(row.parentId)!.folderCount = Number(row.value);
    }
  }

  for (const row of itemCountRows) {
    if (row.folderId) {
      counts.get(row.folderId)!.itemCount = Number(row.value);
    }
  }

  return counts;
}

explorerRoute.get("/contents", requireAdminKey, async (c) => {
  const folderId = optionalFolderId(c.req.query("folderId"));
  const filter = c.req.query("filter") ?? "all";
  const search = c.req.query("search")?.trim() ?? "";
  const sort = c.req.query("sort") ?? "newest";
  const limit = boundedInteger(c.req.query("limit"), 120, 1, 240);
  const offset = boundedInteger(c.req.query("offset"), 0, 0, 100_000);

  const folderWhere = folderId ? eq(explorerFolders.parentId, folderId) : isNull(explorerFolders.parentId);
  const mediaWhere: SQL[] = [];

  if (folderId) {
    mediaWhere.push(eq(explorerMedia.folderId, folderId));
  }

  if (filter === "image" || filter === "video") {
    mediaWhere.push(ilike(explorerMedia.contentType, `${filter}/%`));
  }

  if (search) {
    mediaWhere.push(ilike(explorerMedia.name, `%${search}%`));
  }

  const mediaOrder = sort === "oldest" ? asc(explorerMedia.createdAt) : sort === "name" ? asc(explorerMedia.name) : desc(explorerMedia.createdAt);
  const mediaCondition = mediaWhere.length > 0 ? and(...mediaWhere) : undefined;

  const [folderRows, mediaRows, mediaTotalRows] = await Promise.all([
    db.select().from(explorerFolders).where(folderWhere).orderBy(asc(explorerFolders.name)),
    db.select().from(explorerMedia).where(mediaCondition).orderBy(mediaOrder).limit(limit).offset(offset),
    db.select({ value: count() }).from(explorerMedia).where(mediaCondition)
  ]);
  const counts = await folderCounts(folderRows.map((folder) => folder.id));

  return ok(c, {
    folders: folderRows.map((folder) => toExplorerFolder(folder, counts.get(folder.id))),
    media: mediaRows.map(toExplorerMedia),
    mediaLimit: limit,
    mediaOffset: offset,
    mediaTotal: mediaTotalRows[0]?.value ?? 0
  });
});

explorerRoute.get("/folders", requireAdminKey, async (c) => {
  const rows = await db.select().from(explorerFolders).orderBy(asc(explorerFolders.name));
  const counts = await folderCounts(rows.map((folder) => folder.id));
  return ok(c, rows.map((folder) => toExplorerFolder(folder, counts.get(folder.id))));
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
      previewUrl: file.type.startsWith("image/") ? thumbnailContentUrl(stored.relativePath) : stored.url,
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

  return ok(c, rows.map(toExplorerMedia));
});

explorerRoute.post("/populate", requireAdminKey, async (c) => {
  await populateExplorerFromContentRoot();
  return ok(c, { completed: true });
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
