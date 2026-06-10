import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
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
    const input = Buffer.from(await file.arrayBuffer());

    await sharp(input)
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
