import { serveStatic } from "hono/bun";
import { cors } from "hono/cors";
import { Hono } from "hono";
import { mkdir, stat } from "node:fs/promises";
import { dirname, extname } from "node:path";
import { Readable } from "node:stream";
import { createReadStream } from "node:fs";
import sharp from "sharp";
import { auth } from "./auth";
import { seedBootstrapAdmin } from "./bootstrapAdmin";
import { env } from "./env";
import { assertSafeContentPath, normalizeContentPath } from "./explorer/contentPaths";
import { startExplorerPopulationSchedule } from "./explorer/populateExplorer";
import { fail, ok } from "./http/response";
import { logger } from "./logger";
import { requestContext } from "./middleware/requestContext";
import { securityHeaders } from "./middleware/securityHeaders";
import { openApiHtml, openApiSpec } from "./openapi";
import { adminRoute } from "./routes/admin";
import { explorerRoute } from "./routes/explorer";
import { sitesRoute } from "./routes/sites";
import { uploadsRoute } from "./routes/uploads";
import { createRateLimit } from "./middleware/rateLimit";
import type { AppVariables } from "./types";

const app = new Hono<{ Variables: AppVariables }>();
const adminRateLimit = createRateLimit({ name: "admin", windowSeconds: env.adminRateLimitWindow, max: env.adminRateLimitMax });
const uploadRateLimit = createRateLimit({ name: "uploads", windowSeconds: env.uploadRateLimitWindow, max: env.uploadRateLimitMax });

function contentTypeForPath(path: string) {
  const extension = extname(path).toLowerCase();
  if (extension === ".png") return "image/png";
  if (extension === ".gif") return "image/gif";
  if (extension === ".webp") return "image/webp";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".mp4" || extension === ".m4v") return "video/mp4";
  if (extension === ".webm") return "video/webm";
  if (extension === ".mov") return "video/quicktime";
  return "application/octet-stream";
}

function isImageContentType(contentType: string) {
  return contentType.startsWith("image/");
}

async function ensureThumbnail(sourcePath: string, relativePath: string, sourceModifiedAt: Date) {
  const cachePath = normalizeContentPath(`.arcon-thumbnails/${relativePath}.w720.webp`);
  const { absolutePath } = assertSafeContentPath(cachePath);
  const cachedStat = await stat(absolutePath).catch(() => null);

  if (cachedStat?.isFile() && cachedStat.mtimeMs >= sourceModifiedAt.getTime()) {
    return {
      absolutePath,
      size: cachedStat.size
    };
  }

  await mkdir(dirname(absolutePath), { recursive: true });
  await sharp(sourcePath)
    .rotate()
    .resize({ width: 720, height: 720, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 74 })
    .toFile(absolutePath);

  const thumbnailStat = await stat(absolutePath);
  return {
    absolutePath,
    size: thumbnailStat.size
  };
}

void seedBootstrapAdmin().catch((error) => {
  logger.error("bootstrap_admin.failed", {
    error
  });
});

startExplorerPopulationSchedule();

app.use("*", requestContext);
app.use("*", securityHeaders);

app.use(
  "*",
  cors({
    origin: env.corsOrigins,
    allowHeaders: ["Content-Type", "X-Admin-Key"],
    allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
    credentials: true
  })
);

app.get("/health", (c) =>
  ok(c, {
    ok: true,
    service: "arcon-api"
  })
);

app.get("/openapi.json", (c) => c.json(openApiSpec));

app.get("/docs", (c) => c.html(openApiHtml()));

app.get("/", (c) =>
  ok(c, {
    ok: true,
    service: "arcon-api",
    routes: {
      health: "/health",
      publicSites: "/api/sites",
      adminSession: "/api/admin/session",
      adminSites: "/api/admin/sites",
      uploads: "/api/uploads",
      openapi: "/openapi.json",
      docs: "/docs"
    }
  })
);

app.get("/api/auth/config", (c) =>
  ok(c, {
    authMode: env.authMode,
    signupMode: env.betterAuthSignupMode
  })
);

app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));
app.route("/api/sites", sitesRoute);
app.use("/api/admin/*", adminRateLimit);
app.route("/api/admin", adminRoute);
app.route("/api/explorer", explorerRoute);
app.use("/api/uploads/*", uploadRateLimit);
app.route("/api/uploads", uploadsRoute);
app.use("/uploads/*", serveStatic({ root: "./" }));
app.get("/content-thumbnails/*", async (c) => {
  const rawPath = decodeURIComponent(c.req.path.replace(/^\/content-thumbnails\//, ""));

  try {
    const { absolutePath, normalized } = assertSafeContentPath(rawPath);
    const fileStat = await stat(absolutePath).catch(() => null);
    const originalContentType = contentTypeForPath(absolutePath);

    if (!fileStat?.isFile() || !isImageContentType(originalContentType)) {
      return fail(c, "Thumbnail not found", 404, { code: "THUMBNAIL_NOT_FOUND" });
    }

    const thumbnail = await ensureThumbnail(absolutePath, normalized, fileStat.mtime);

    c.header("Cache-Control", "public, max-age=31536000, immutable");
    c.header("Content-Length", String(thumbnail.size));
    c.header("Content-Type", "image/webp");
    return new Response(Readable.toWeb(createReadStream(thumbnail.absolutePath)) as unknown as ReadableStream);
  } catch (error) {
    logger.warn("content.thumbnail_failed", { error });
    return fail(c, "Thumbnail not found", 404, { code: "THUMBNAIL_NOT_FOUND" });
  }
});
app.get("/content/*", async (c) => {
  const rawPath = decodeURIComponent(c.req.path.replace(/^\/content\//, ""));

  try {
    const { absolutePath } = assertSafeContentPath(rawPath);
    const fileStat = await stat(absolutePath).catch(() => null);

    if (!fileStat?.isFile()) {
      return fail(c, "Content not found", 404, { code: "CONTENT_NOT_FOUND" });
    }

    c.header("Cache-Control", "public, max-age=31536000, immutable");
    c.header("Content-Length", String(fileStat.size));
    c.header("Content-Type", contentTypeForPath(absolutePath));
    return new Response(Readable.toWeb(createReadStream(absolutePath)) as unknown as ReadableStream);
  } catch {
    return fail(c, "Content not found", 404, { code: "CONTENT_NOT_FOUND" });
  }
});

app.notFound((c) => fail(c, "Route not found", 404, { code: "ROUTE_NOT_FOUND" }));

app.onError((error, c) => {
  logger.error("http.unhandled_error", {
    requestId: c.get("requestId"),
    error
  });

  return fail(c, "Internal server error", 500, { code: "INTERNAL_SERVER_ERROR" });
});

export default {
  port: env.port,
  fetch: app.fetch
};

logger.info("api.started", {
  url: `http://localhost:${env.port}`
});
