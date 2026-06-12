import { and, eq, inArray } from "drizzle-orm";
import { mkdir, rm, stat } from "node:fs/promises";
import { dirname } from "node:path";
import { spawn } from "node:child_process";
import sharp from "sharp";
import { explorerMedia } from "../../db/schema";
import { db } from "../db";
import { env } from "../env";
import { logger } from "../logger";
import { assertSafeContentPath, normalizeContentPath } from "./contentPaths";

type ThumbnailRunStats = {
  failed: number;
  generated: number;
  skipped: number;
};

let thumbnailMaintenancePromise: Promise<ThumbnailRunStats> | null = null;
let videoThumbnailingAvailable = true;

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

async function ensureContentThumbnail(sourcePath: string, relativePath: string, sourceModifiedAt: Date, options: { force: boolean }) {
  const cachePath = normalizeContentPath(`.arcon-thumbnails/${relativePath}.w720.webp`);
  const { absolutePath } = assertSafeContentPath(cachePath);
  const cachedStat = await stat(absolutePath).catch(() => null);

  if (!options.force && cachedStat?.isFile() && cachedStat.mtimeMs >= sourceModifiedAt.getTime()) {
    return false;
  }

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
      skipped: 0
    };

    logger.info("explorer.thumbnails.started", { force: options.force });

    const mediaRows = await db
      .select({
        storageKey: explorerMedia.storageKey,
        storageResourceType: explorerMedia.storageResourceType
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
        const errorCode = typeof error === "object" && error && "code" in error ? error.code : "";
        if (errorCode === "ENOENT") {
          videoThumbnailingAvailable = false;
        }

        stats.failed += 1;
        logger.warn("explorer.thumbnail_maintenance.item_failed", {
          error,
          storageKey: media.storageKey
        });
      }
    }

    logger.info("explorer.thumbnails.completed", {
      ...stats,
      durationMs: Date.now() - startedAt
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
  const { absolutePath } = assertSafeContentPath(".arcon-thumbnails");
  await rm(absolutePath, { force: true, recursive: true });
  return generateContentThumbnails({ force: true });
}
