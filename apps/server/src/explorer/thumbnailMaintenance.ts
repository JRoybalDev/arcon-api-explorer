import { and, eq, inArray } from "drizzle-orm";
import { mkdir, rm, stat, access } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { dirname } from "node:path";
import { spawn } from "node:child_process";
import sharp from "sharp";
import { explorerMedia } from "../../db/schema";
import { db } from "../db";
import { env } from "../env";
import { logger } from "../logger";
import { assertSafeContentPath, thumbnailCacheDirectories, thumbnailCachePath } from "./contentPaths";

type ThumbnailRunStats = {
  failed: number;
  generated: number;
  skipped: number;
};

let thumbnailMaintenancePromise: Promise<ThumbnailRunStats> | null = null;

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
  // Always check ffmpeg accessibility fresh — never rely on a cached flag
  // so that a bad first run doesn't permanently block all subsequent videos.
  try {
    await access(env.ffmpegPath, fsConstants.X_OK);
  } catch (accessErr) {
    logger.warn("explorer.thumbnail.ffmpeg_not_executable", {
      ffmpegPath: env.ffmpegPath,
      error: String(accessErr),
    });
    throw new Error(`ffmpeg is not accessible at ${env.ffmpegPath}: ${String(accessErr)}`);
  }

  await new Promise<void>((resolvePromise, rejectPromise) => {
    const args = ["-y", "-ss", "00:00:01", "-i", sourcePath, "-frames:v", "1", "-vf", "scale=min(720\\,iw):-2", outputPath];
    logger.info("explorer.thumbnail.ffmpeg_start", { ffmpegPath: env.ffmpegPath, args, sourcePath, outputPath });

    const child = spawn(env.ffmpegPath, args, { stdio: ["ignore", "ignore", "pipe"] });

    let stderr = "";
    if (child.stderr) {
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });
    }

    const started = Date.now();
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      rejectPromise(new Error("Video thumbnail generation timed out"));
    }, 30_000);

    child.once("error", (error) => {
      clearTimeout(timeout);
      logger.warn("explorer.thumbnail.ffmpeg_spawn_error", {
        error: String(error),
        ffmpegPath: env.ffmpegPath,
        sourcePath,
        outputPath,
      });
      rejectPromise(error);
    });

    child.once("exit", async (code) => {
      clearTimeout(timeout);
      const durationMs = Date.now() - started;
      if (code === 0) {
        const outStat = await stat(outputPath).catch(() => null);
        logger.info("explorer.thumbnail.ffmpeg_success", {
          sourcePath,
          outputPath,
          durationMs,
          size: outStat?.size ?? null,
        });
        resolvePromise();
        return;
      }

      logger.warn("explorer.thumbnail.ffmpeg_failed", {
        code,
        stderr: stderr.trim(),
        durationMs,
        sourcePath,
        outputPath,
      });
      rejectPromise(new Error(`ffmpeg exited with code ${code ?? "unknown"}: ${stderr.trim()}`));
    });
  });
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
    const stats: ThumbnailRunStats = {
      failed: 0,
      generated: 0,
      skipped: 0,
    };

    logger.info("explorer.thumbnails.started", { force: options.force });

    const mediaRows = await db
      .select({
        storageKey: explorerMedia.storageKey,
        storageResourceType: explorerMedia.storageResourceType,
      })
      .from(explorerMedia)
      .where(and(eq(explorerMedia.storageProvider, "local"), inArray(explorerMedia.storageResourceType, ["image", "video"])));

    for (const media of mediaRows) {
      if (!media.storageKey) {
        stats.skipped += 1;
        continue;
      }

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
        logger.warn("explorer.thumbnail_maintenance.item_failed", {
          error,
          storageKey: media.storageKey,
        });
      }
    }

    logger.info("explorer.thumbnails.completed", {
      ...stats,
      durationMs: Date.now() - startedAt,
    });

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