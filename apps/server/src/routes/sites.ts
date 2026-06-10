import { SiteDraftSchema } from "@fullstack-template/schema";
import { and, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../db";
import { sites } from "../../db/schema";
import { fail, ok } from "../http/response";
import { toSite } from "../mappers";
import { requireAdminKey } from "../middleware/admin";
import type { AppVariables } from "../types";

export const sitesRoute = new Hono<{ Variables: AppVariables }>();

sitesRoute.get("/", async (c) => {
  const rows = await db.select().from(sites).where(eq(sites.published, true)).orderBy(desc(sites.updatedAt));
  return ok(c, rows.map(toSite));
});

sitesRoute.get("/:slug", async (c) => {
  const slug = c.req.param("slug");
  const [site] = await db.select().from(sites).where(and(eq(sites.slug, slug), eq(sites.published, true))).limit(1);

  if (!site) {
    return fail(c, "Site not found", 404, { code: "SITE_NOT_FOUND" });
  }

  return ok(c, toSite(site));
});

sitesRoute.post("/", requireAdminKey, async (c) => {
  const body = await c.req.json();
  const parsed = SiteDraftSchema.safeParse(body);

  if (!parsed.success) {
    return fail(c, "Invalid site payload", 400, { code: "SITE_INVALID", details: parsed.error.flatten() });
  }

  const [site] = await db
    .insert(sites)
    .values({
      ...parsed.data,
      updatedAt: new Date()
    })
    .onConflictDoUpdate({
      target: sites.slug,
      set: {
        title: parsed.data.title,
        description: parsed.data.description,
        heroImageUrl: parsed.data.heroImageUrl,
        metadata: parsed.data.metadata,
        branding: parsed.data.branding,
        links: parsed.data.links,
        published: parsed.data.published,
        updatedAt: new Date()
      }
    })
    .returning();

  if (!site) {
    return fail(c, "Site was not saved", 500, { code: "SITE_SAVE_FAILED" });
  }

  return ok(c, toSite(site), 201);
});

sitesRoute.delete("/:slug", requireAdminKey, async (c) => {
  const slug = c.req.param("slug");
  const [deleted] = await db.delete(sites).where(eq(sites.slug, slug)).returning();

  if (!deleted) {
    return fail(c, "Site not found", 404, { code: "SITE_NOT_FOUND" });
  }

  return ok(c, toSite(deleted));
});
