import { serveStatic } from "hono/bun";
import { cors } from "hono/cors";
import { Hono } from "hono";
import type { Context } from "hono";
import { mkdir, stat } from "node:fs/promises";
import { dirname, extname, resolve, sep } from "node:path";
import { Readable } from "node:stream";
import { spawn } from "node:child_process";
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
const webDistRoot = "../web/dist";
const serveWebIndex = serveStatic({ root: webDistRoot, path: "index.html" });
let videoThumbnailingAvailable = true;

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

function parseRangeHeader(rangeHeader: string | null, size: number) {
  if (!rangeHeader) {
    return null;
  }

  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
  if (!match) {
    return "invalid" as const;
  }

  const [, startValue = "", endValue = ""] = match;
  if (!startValue && !endValue) {
    return "invalid" as const;
  }

  if (!startValue) {
    const suffixLength = Number(endValue);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) {
      return "invalid" as const;
    }

    return {
      start: Math.max(size - suffixLength, 0),
      end: size - 1
    };
  }

  const start = Number(startValue);
  const requestedEnd = endValue ? Number(endValue) : size - 1;

  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(requestedEnd) || start < 0 || requestedEnd < start || start >= size) {
    return "invalid" as const;
  }

  return {
    start,
    end: Math.min(requestedEnd, size - 1)
  };
}

function assertSafeUploadPath(pathname: string) {
  const normalized = pathname
    .replace(/\\/g, "/")
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean)
    .join("/");

  if (!normalized || normalized.includes("..")) {
    throw new Error("Unsafe upload path");
  }

  const root = resolve(env.uploadDir);
  const absolutePath = resolve(root, normalized);
  const rootWithSeparator = root.endsWith(sep) ? root : `${root}${sep}`;

  if (absolutePath !== root && !absolutePath.startsWith(rootWithSeparator)) {
    throw new Error("Unsafe upload path");
  }

  return absolutePath;
}

function streamFileResponse(c: Context, absolutePath: string, size: number, contentType: string) {
  const headers = new Headers({
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=31536000, immutable",
    "Content-Type": contentType
  });

  const range = parseRangeHeader(c.req.header("range") ?? null, size);

  if (range === "invalid") {
    headers.set("Content-Range", `bytes */${size}`);
    return new Response(null, { status: 416, headers });
  }

  if (range) {
    const chunkSize = range.end - range.start + 1;
    headers.set("Content-Length", String(chunkSize));
    headers.set("Content-Range", `bytes ${range.start}-${range.end}/${size}`);
    return new Response(Readable.toWeb(createReadStream(absolutePath, { start: range.start, end: range.end })) as unknown as ReadableStream, { status: 206, headers });
  }

  headers.set("Content-Length", String(size));
  return new Response(Readable.toWeb(createReadStream(absolutePath)) as unknown as ReadableStream, { headers });
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
  const contentType = contentTypeForPath(sourcePath);

  if (isImageContentType(contentType)) {
    await sharp(sourcePath)
      .rotate()
      .resize({ width: 720, height: 720, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 74 })
      .toFile(absolutePath);
  } else if (contentType.startsWith("video/")) {
    await createVideoThumbnail(sourcePath, absolutePath);
  } else {
    throw new Error("Unsupported thumbnail source");
  }

  const thumbnailStat = await stat(absolutePath);
  return {
    absolutePath,
    size: thumbnailStat.size
  };
}

async function createVideoThumbnail(sourcePath: string, outputPath: string) {
  if (!videoThumbnailingAvailable) {
    throw new Error("Video thumbnailing is unavailable");
  }

  await new Promise<void>((resolvePromise, rejectPromise) => {
    const child = spawn(env.ffmpegPath, ["-y", "-ss", "00:00:01", "-i", sourcePath, "-frames:v", "1", "-vf", "scale=min(720\\,iw):-2", "-quality", "74", outputPath], {
      stdio: "ignore"
    });
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      rejectPromise(new Error("Video thumbnail generation timed out"));
    }, 30_000);

    child.once("error", (error) => {
      clearTimeout(timeout);
      rejectPromise(error);
    });
    child.once("exit", (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolvePromise();
        return;
      }

      rejectPromise(new Error(`ffmpeg exited with code ${code ?? "unknown"}`));
    });
  });
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

app.get("/api", (c) =>
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
app.get("/uploads/*", async (c) => {
  const rawPath = decodeURIComponent(c.req.path.replace(/^\/uploads\//, ""));

  try {
    const absolutePath = assertSafeUploadPath(rawPath);
    const fileStat = await stat(absolutePath).catch(() => null);

    if (!fileStat?.isFile()) {
      return fail(c, "Upload not found", 404, { code: "UPLOAD_NOT_FOUND" });
    }

    return streamFileResponse(c, absolutePath, fileStat.size, contentTypeForPath(absolutePath));
  } catch {
    return fail(c, "Upload not found", 404, { code: "UPLOAD_NOT_FOUND" });
  }
});
app.get("/content-thumbnails/*", async (c) => {
  const rawPath = decodeURIComponent(c.req.path.replace(/^\/content-thumbnails\//, ""));

  try {
    const { absolutePath, normalized } = assertSafeContentPath(rawPath);
    const fileStat = await stat(absolutePath).catch(() => null);
    const originalContentType = contentTypeForPath(absolutePath);

    if (!fileStat?.isFile() || (!isImageContentType(originalContentType) && !originalContentType.startsWith("video/"))) {
      return fail(c, "Thumbnail not found", 404, { code: "THUMBNAIL_NOT_FOUND" });
    }

    const thumbnail = await ensureThumbnail(absolutePath, normalized, fileStat.mtime);

    c.header("Cache-Control", "public, max-age=31536000, immutable");
    c.header("Content-Length", String(thumbnail.size));
    c.header("Content-Type", "image/webp");
    return new Response(Readable.toWeb(createReadStream(thumbnail.absolutePath)) as unknown as ReadableStream);
  } catch (error) {
    const errorCode = typeof error === "object" && error && "code" in error ? error.code : "";
    const isMissingFfmpeg = errorCode === "ENOENT";

    if (isMissingFfmpeg) {
      videoThumbnailingAvailable = false;
      logger.warn("content.video_thumbnailing_unavailable", {
        ffmpegPath: env.ffmpegPath,
        error: "FFmpeg was not found. Install ffmpeg or set FFMPEG_PATH to enable video thumbnails."
      });
    } else if (videoThumbnailingAvailable) {
      logger.warn("content.thumbnail_failed", { error });
    }

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

    return streamFileResponse(c, absolutePath, fileStat.size, contentTypeForPath(absolutePath));
  } catch {
    return fail(c, "Content not found", 404, { code: "CONTENT_NOT_FOUND" });
  }
});

app.use("/assets/*", serveStatic({ root: webDistRoot }));
app.use("/pwa/*", serveStatic({ root: webDistRoot }));
app.get("/favicon.svg", serveStatic({ root: webDistRoot }));
app.get("/manifest.webmanifest", serveStatic({ root: webDistRoot }));
app.get("/sw.js", serveStatic({ root: webDistRoot }));
app.get("/", serveWebIndex);
app.get("/settings", serveWebIndex);
app.get("/dashboard", serveWebIndex);
app.get("/reset-password", serveWebIndex);

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
  idleTimeout: 255,
  fetch: app.fetch
};

logger.info("api.started", {
  url: `http://localhost:${env.port}`
});
