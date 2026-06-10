import { desc, eq } from "drizzle-orm";
import { Hono, type Context } from "hono";
import { uploads } from "../../db/schema";
import { db } from "../db";
import { fail, ok } from "../http/response";
import { toUpload } from "../mappers";
import { requireAdminKey } from "../middleware/admin";
import { deleteStoredUpload, replaceStoredUpload, storeUpload } from "../storage/uploadStorage";
import type { AppVariables } from "../types";

export const uploadsRoute = new Hono<{ Variables: AppVariables }>();

async function fileFromRequest(c: Context<{ Variables: AppVariables }>) {
  const form = await c.req.formData();
  const file = form.get("file");
  return file instanceof File && file.size > 0 ? file : null;
}

uploadsRoute.get("/", requireAdminKey, async (c) => {
  const rows = await db.select().from(uploads).orderBy(desc(uploads.createdAt));
  return ok(c, rows.map(toUpload));
});

uploadsRoute.post("/", requireAdminKey, async (c) => {
  const file = await fileFromRequest(c);

  if (!file) {
    return fail(c, "Expected a file field", 400, { code: "UPLOAD_FILE_REQUIRED" });
  }

  const stored = await storeUpload(file);

  const [upload] = await db
    .insert(uploads)
    .values({
      filename: file.name,
      url: stored.url,
      thumbnailUrl: stored.thumbnailUrl,
      storageProvider: stored.storageProvider,
      storageKey: stored.storageKey,
      storageResourceType: stored.storageResourceType,
      contentType: file.type || "application/octet-stream",
      size: file.size
    })
    .returning();

  if (!upload) {
    await deleteStoredUpload(stored);
    return fail(c, "Upload was not saved", 500, { code: "UPLOAD_SAVE_FAILED" });
  }

  return ok(c, toUpload(upload), 201);
});

uploadsRoute.post("/:id/replace", requireAdminKey, async (c) => {
  const id = c.req.param("id");
  const file = await fileFromRequest(c);

  if (!file) {
    return fail(c, "Expected a file field", 400, { code: "UPLOAD_FILE_REQUIRED" });
  }

  const [existing] = await db.select().from(uploads).where(eq(uploads.id, id)).limit(1);

  if (!existing) {
    return fail(c, "Upload not found", 404, { code: "UPLOAD_NOT_FOUND" });
  }

  const updated = await replaceStoredUpload(existing, file, async (stored) => {
    const [row] = await db
      .update(uploads)
      .set({
        filename: file.name,
        url: stored.url,
        thumbnailUrl: stored.thumbnailUrl,
        storageProvider: stored.storageProvider,
        storageKey: stored.storageKey,
        storageResourceType: stored.storageResourceType,
        contentType: file.type || "application/octet-stream",
        size: file.size
      })
      .where(eq(uploads.id, id))
      .returning();

    if (!row) {
      throw new Error("Upload was not replaced");
    }

    return row;
  }).catch((error) => {
    if (error instanceof Error && error.message === "Upload was not replaced") {
      return null;
    }

    throw error;
  });

  if (!updated) {
    return fail(c, "Upload was not replaced", 500, { code: "UPLOAD_REPLACE_FAILED" });
  }

  return ok(c, toUpload(updated));
});

uploadsRoute.delete("/:id", requireAdminKey, async (c) => {
  const id = c.req.param("id");
  const [deleted] = await db.delete(uploads).where(eq(uploads.id, id)).returning();

  if (!deleted) {
    return fail(c, "Upload not found", 404, { code: "UPLOAD_NOT_FOUND" });
  }

  await deleteStoredUpload(deleted);
  return ok(c, toUpload(deleted));
});
