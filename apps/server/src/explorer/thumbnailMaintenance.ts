import { and, eq, inArray } from "drizzle-orm";
import { mkdir, rm, stat, access } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { dirname } from "node:path";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import sharp from "sharp";
import { explorerMedia } from "../../db/schema";
import { db } from "../db";
import { env } from "../env";
import { logger } from "../logger";
import { assertSafeContentPath, thumbnailCacheDirectories, thumbnailCachePath } from "./contentPaths";

const execFileAsync = promisify(execFile);

type ThumbnailRunStats = {
  failed: number;
  generated: number;
  skipped: number;
};

let thumbnailMaintenancePromise: Promise<ThumbnailRunStats> | null = null;

// Resolved once at first use. env.ffmpegPath is always tried first.
let resolvedFfmpegPath: string | null = null;
let resolvedFfprobePath: string | null = null;

async function findExecutable(candidates: string[]): Promise<string | null> {
  for (const candidate of candidates) {
    try {
      await access(candidate, fsConstants.X_OK);
      return candidate;
    } catch {
      // try next
    }
  }
  return null;
}

async function getFfmpegPath(): Promise<string> {
  if (!resolvedFfmpegPath) {
    // env.ffmpegPath is always first — it's the admin-configured value
    resolvedFfmpegPath = await findExecutable([
      env.ffmpegPath,
      "/AMP/bun-app-runner/app/usr/bin/ffmpeg",
      "/usr/bin/ffmpeg",
      "/usr/local/bin/ffmpeg",
    ]);
    if (resolvedFfmpegPath) {
      logger.info("explorer.thumbnail.ffmpeg_resolved", { path: resolvedFfmpegPath, configured: env.ffmpegPath });
    } else {
      logger.error("explorer.thumbnail.ffmpeg_not_found", {
        configured: env.ffmpegPath,
        tried: [env.ffmpegPath, "/AMP/bun-app-runner/app/usr/bin/ffmpeg", "/usr/bin/ffmpeg", "/usr/local/bin/ffmpeg"],
      });
    }
  }
  if (!resolvedFfmpegPath) {
    throw new Error(`ffmpeg not found. Configured path: ${env.ffmpegPath}`);
  }
  return resolvedFfmpegPath;
}

async function getFfprobePath(): Promise<string> {
  if (!resolvedFfprobePath) {
    const ffmpeg = await getFfmpegPath();
    const derived = ffmpeg.replace(/ffmpeg$/, "ffprobe");
    resolvedFfprobePath = await findExecutable([
      env.ffmpegPath.replace(/ffmpeg$/, "ffprobe"),
      derived,
      "/AMP/bun-app-runner/app/usr/bin/ffprobe",
      "/usr/bin/ffprobe",
    ]);
    if (resolvedFfprobePath) {
      logger.info("explorer.thumbnail.ffprobe_resolved", { path: resolvedFfprobePath });
    }
  }
  // ffprobe is optional — fall back to derived path even if not verified
  return resolvedFfprobePath ?? (await getFfmpegPath()).replace(/ffmpeg$/, "ffprobe");
}

async function probeVideoDuration(videoPath: string, ffprobePath: string): Promise<number> {
  const { stdout } = await execFileAsync(ffprobePath, [
    "-v", "quiet",
    "-print_format", "json",
    "-show_format",
    videoPath,
  ]);
  try {
    const meta = JSON.parse(stdout);
    return Number(meta?.format?.duration) || 30;
  } catch {
    return 30;
  }
}

function contentTypeForPath(path: string) {
  const extension = path.toLowerCase().split(".").pop();
  if (extension === "png") return "image/png";
  if (extension === "gif") return "image/gif";
  if (extension === "webp") return "image/webp";
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "mp4" || extension === "m4v") return "video/mp4";
  if (extension === "webm") return "video/webm";
  if (extension === "mov") return "video/quicktime";
  return "application/octet-stream";
}

function isThumbnailable(contentType: string) {
  return contentType.startsWith("image/") || contentType.startsWith("video/");
}

async function createVideoThumbnail(sourcePath: string, outputPath: string) {
  const ffmpegPath = await getFfmpegPath();
  const ffprobePath = await getFfprobePath();

  // Probe to get real duration so we seek to a non-black frame
  let seekTime = "00:00:01";
  try {
    const duration = await probeVideoDuration(sourcePath, ffprobePath);
    const seekSeconds = Math.min(Math.max(duration * 0.1, 1), 10);
    const mm = String(Math.floor(seekSeconds / 60)).padStart(2, "0");
    const ss = String(Math.floor(seekSeconds % 60)).padStart(2, "0");
    seekTime = `00:${mm}:${ss}`;
  } catch (probeErr) {
    logger.warn("explorer.thumbnail.ffprobe_failed", { sourcePath, error: String(probeErr) });
  }

  const MAX_RETRIES = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await new Promise<void>((resolvePromise, rejectPromise) => {
        const args = [
          "-y", "-ss", seekTime,
          "-i", sourcePath,
          "-frames:v", "1",
          "-vf", "scale=min(720\\,iw):-2",
          outputPath,
        ];

        logger.info("explorer.thumbnail.ffmpeg_start", { ffmpegPath, sourcePath, outputPath, seekTime, attempt });

        const child = spawn(ffmpegPath, args, { stdio: ["ignore", "ignore", "pipe"] });

        let stderr = "";
        child.stderr?.on("data", (chunk) => { stderr += chunk.toString(); });

        const started = Date.now();
        const timeout = setTimeout(() => {
          child.kill("SIGKILL");
          rejectPromise(new Error("Video thumbnail generation timed out"));
        }, 30_000);

        child.once("error", (error) => {
          clearTimeout(timeout);
          if ((error as NodeJS.ErrnoException).code === "ENOENT") {
            // Binary disappeared — force re-resolution next call
            resolvedFfmpegPath = null;
          }
          logger.warn("explorer.thumbnail.ffmpeg_spawn_error", { error: String(error), ffmpegPath, sourcePath, attempt });
          rejectPromise(error);
        });

        child.once("exit", async (code) => {
          clearTimeout(timeout);
          const durationMs = Date.now() - started;
          if (code === 0) {
            const outStat = await stat(outputPath).catch(() => null);
            logger.info("explorer.thumbnail.ffmpeg_success", { sourcePath, outputPath, durationMs, size: outStat?.size ?? null, attempt });
            resolvePromise();
            return;
          }
          logger.warn("explorer.thumbnail.ffmpeg_failed", { code, stderr: stderr.trim(), durationMs, sourcePath, outputPath, attempt });
          rejectPromise(new Error(`ffmpeg exited with code ${code ?? "unknown"}: ${stderr.trim()}`));
        });
      });

      return; // success
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES) {
        const delay = attempt * 500;
        logger.warn("explorer.thumbnail.ffmpeg_retrying", { attempt, delay, sourcePath, error: String(err) });
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  throw lastError;
}

async function ensureContentThumbnail(sourcePath: string, relativePath: string, sourceModifiedAt: Date, options: { force: boolean }) {
  if (!options.force) {
    for (const cacheDirectory of thumbnailCacheDirectories) {
      const { absolutePath } = assertSafeContentPath(thumbnailCachePath(relativePath, cacheDirectory));
      const cachedStat = await stat(absolutePath).catch(() => null);
      if (cachedStat?.isFile() && cachedStat.mtimeMs >= sourceModifiedAt.getTime()) {
        return false;
      }
    }
  }

  const { absolutePath } = assertSafeContentPath(thumbnailCachePath(relativePath));
  await mkdir(dirname(absolutePath), { recursive: true });
  const contentType = contentTypeForPath(sourcePath);

  if (contentType.startsWith("image/")) {
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

  return true;
}

async function generateContentThumbnails(options: { force: boolean }): Promise<ThumbnailRunStats> {
  if (thumbnailMaintenancePromise) {
    return thumbnailMaintenancePromise;
  }

  thumbnailMaintenancePromise = (async () => {
    const startedAt = Date.now();
    const stats: ThumbnailRunStats = { failed: 0, generated: 0, skipped: 0 };

    logger.info("explorer.thumbnails.started", { force: options.force });

    const mediaRows = await db
      .select({
        storageKey: explorerMedia.storageKey,
        storageResourceType: explorerMedia.storageResourceType,
      })
      .from(explorerMedia)
      .where(and(eq(explorerMedia.storageProvider, "local"), inArray(explorerMedia.storageResourceType, ["image", "video"])));

    for (const media of mediaRows) {
      if (!media.storageKey) { stats.skipped += 1; continue; }

      try {
        const { absolutePath, normalized } = assertSafeContentPath(media.storageKey);
        const fileStat = await stat(absolutePath).catch(() => null);
        const contentType = contentTypeForPath(absolutePath);

        if (!fileStat?.isFile() || !isThumbnailable(contentType)) {
          stats.skipped += 1;
          continue;
        }

        const generated = await ensureContentThumbnail(absolutePath, normalized, fileStat.mtime, { force: options.force });
        if (generated) {
          stats.generated += 1;
        } else {
          stats.skipped += 1;
        }
      } catch (error) {
        stats.failed += 1;
        logger.warn("explorer.thumbnail_maintenance.item_failed", { error, storageKey: media.storageKey });
      }
    }

    logger.info("explorer.thumbnails.completed", { ...stats, durationMs: Date.now() - startedAt });
    return stats;
  })().finally(() => {
    thumbnailMaintenancePromise = null;
  });

  return thumbnailMaintenancePromise;
}

export function generateMissingContentThumbnails() {
  return generateContentThumbnails({ force: false });
}

export async function deleteAndRegenerateContentThumbnails() {
  await Promise.all(
    thumbnailCacheDirectories.map((cacheDirectory) => {
      const { absolutePath } = assertSafeContentPath(cacheDirectory);
      return rm(absolutePath, { force: true, recursive: true });
    })
  );
  return generateContentThumbnails({ force: true });
}