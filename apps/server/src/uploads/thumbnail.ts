import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { Readable } from "node:stream";
import { logger } from "../logger";

export type CreatedThumbnail = {
  url: string;
};

const thumbnailSize = 480;

function isImage(file: File) {
  return file.type.startsWith("image/");
}

export async function createThumbnail(file: File, uploadDir: string): Promise<CreatedThumbnail | null> {
  if (!isImage(file)) {
    return null;
  }

  await mkdir(uploadDir, { recursive: true });

  const filename = `thumb-${crypto.randomUUID()}.webp`;
  const path = join(uploadDir, filename);

  try {
    // Stream the file into sharp to avoid buffering large image files in memory
    const nodeReadable = (Readable as any).fromWeb?.(file.stream() as any) ?? Readable.from(file.stream() as any);

    await sharp(nodeReadable as any)
      .rotate()
      .resize(thumbnailSize, thumbnailSize, {
        fit: "inside",
        withoutEnlargement: true
      })
      .webp({ quality: 82 })
      .toFile(path);

    return {
      url: `/uploads/${filename}`
    };
  } catch (error) {
    logger.warn("uploads.thumbnail_failed", {
      error,
      filename: file.name,
      contentType: file.type
    });
    return null;
  }
}
