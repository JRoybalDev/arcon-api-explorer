import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createWriteStream } from "node:fs";
import { Readable } from "node:stream";
import type { UploadRow } from "../../db/schema";
import { env } from "../env";
import { logger } from "../logger";
import { createThumbnail } from "../uploads/thumbnail";

export type StoredUpload = {
  url: string;
  thumbnailUrl: string;
  storageProvider: "local" | "cloudinary";
  storageKey: string;
  storageResourceType: "image" | "video" | "raw";
};

type StoredUploadReference = {
  storageProvider: string;
  storageKey: string;
  storageResourceType: string;
  thumbnailUrl: string;
  url: string;
};

function extensionFor(file: File) {
  return file.name.includes(".") ? file.name.split(".").pop() || "bin" : "bin";
}

async function storeLocalUpload(file: File): Promise<StoredUpload> {
  await mkdir(env.uploadDir, { recursive: true });

  const safeName = `${crypto.randomUUID()}.${extensionFor(file)}`;
  const path = join(env.uploadDir, safeName);

  // Stream the incoming file to disk to avoid buffering large files in memory
  await new Promise<void>((resolve, reject) => {
    const writeStream = createWriteStream(path, { flags: "w" });
    const nodeReadable = (Readable as any).fromWeb?.(file.stream() as any) ?? Readable.from(file.stream() as any);

    nodeReadable.on("error", (err: any) => {
      writeStream.destroy(err);
      reject(err);
    });

    writeStream.on("error", (err) => reject(err));
    writeStream.on("finish", () => resolve());

    nodeReadable.pipe(writeStream);
  });

  const thumbnail = await createThumbnail(file, env.uploadDir);

  return {
    url: `/uploads/${safeName}`,
    thumbnailUrl: thumbnail?.url ?? "",
    storageProvider: "local",
    storageKey: safeName,
    storageResourceType: file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : "raw"
  };
}

function assertCloudinaryConfigured() {
  if (!env.cloudinaryCloudName || !env.cloudinaryApiKey || !env.cloudinaryApiSecret) {
    throw new Error("Cloudinary storage requires CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.");
  }

  cloudinary.config({
    cloud_name: env.cloudinaryCloudName,
    api_key: env.cloudinaryApiKey,
    api_secret: env.cloudinaryApiSecret,
    secure: true
  });
}

async function uploadToCloudinary(file: File): Promise<UploadApiResponse> {
  assertCloudinaryConfigured();
  return new Promise((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      {
        folder: env.cloudinaryFolder,
        resource_type: "auto",
        use_filename: true,
        unique_filename: true
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary upload failed."));
          return;
        }

        resolve(result);
      }
    );

    // Pipe the web ReadableStream directly into Cloudinary upload stream to avoid buffering
    const nodeReadable = (Readable as any).fromWeb?.(file.stream() as any) ?? Readable.from(file.stream() as any);
    nodeReadable.on("error", (err: any) => reject(err));
    nodeReadable.pipe(upload as any);
  });
}

async function storeCloudinaryUpload(file: File): Promise<StoredUpload> {
  const result = await uploadToCloudinary(file);
  const thumbnailUrl =
    result.resource_type === "image"
      ? cloudinary.url(result.public_id, {
          secure: true,
          transformation: [{ width: 480, height: 480, crop: "fill", quality: "auto", fetch_format: "auto" }]
        })
      : "";

  return {
    url: result.secure_url,
    thumbnailUrl,
    storageProvider: "cloudinary",
    storageKey: result.public_id,
    storageResourceType: result.resource_type === "image" || result.resource_type === "video" || result.resource_type === "raw" ? result.resource_type : "raw"
  };
}

export async function storeUpload(file: File): Promise<StoredUpload> {
  if (env.storageDriver === "cloudinary") {
    return storeCloudinaryUpload(file);
  }

  return storeLocalUpload(file);
}

function localPathFromUploadsUrl(url: string) {
  if (!url.startsWith("/uploads/")) {
    return "";
  }

  const relativePath = url.replace(/^\/uploads\//, "");
  return join(env.uploadDir, relativePath);
}

async function deleteLocalUpload(upload: Pick<UploadRow, "storageKey" | "thumbnailUrl" | "url">) {
  const originalPath = upload.storageKey ? join(env.uploadDir, upload.storageKey) : localPathFromUploadsUrl(upload.url);
  const thumbnailPath = localPathFromUploadsUrl(upload.thumbnailUrl);

  await Promise.all(
    [originalPath, thumbnailPath].filter(Boolean).map((path) =>
      rm(path, { force: true }).catch((error) => {
        logger.warn("storage.local_delete_failed", {
          error,
          path
        });
      })
    )
  );
}

async function deleteCloudinaryUpload(upload: Pick<UploadRow, "storageKey" | "storageResourceType">) {
  if (!upload.storageKey) {
    return;
  }

  assertCloudinaryConfigured();

  await cloudinary.uploader.destroy(upload.storageKey, {
    resource_type: upload.storageResourceType === "image" || upload.storageResourceType === "video" || upload.storageResourceType === "raw" ? upload.storageResourceType : "image"
  });
}

export async function deleteStoredUpload(upload: StoredUploadReference) {
  if (upload.storageProvider === "cloudinary") {
    await deleteCloudinaryUpload(upload);
    return;
  }

  await deleteLocalUpload(upload);
}

export async function replaceStoredUpload<T>(oldUpload: StoredUploadReference, file: File, commit: (stored: StoredUpload) => Promise<T>) {
  const nextUpload = await storeUpload(file);

  try {
    const result = await commit(nextUpload);
    await deleteStoredUpload(oldUpload);
    return result;
  } catch (error) {
    await deleteStoredUpload(nextUpload);
    throw error;
  }
}
