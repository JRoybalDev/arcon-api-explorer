import { eq, like } from "drizzle-orm";
import { explorerFolders, explorerMedia } from "../db/schema";
import { db, sql } from "./db";
import { logger } from "./logger";

type SeedFolder = {
  id: string;
  name: string;
  path: string;
};

const rootNames = ["Architecture", "Nature", "Portraits", "Street Photography", "Abstracts", "Travel", "Projects", "Archive"];
const childNames = ["Favorites", "Night Shots", "Reference", "Raw Selects", "Edited", "Moodboard", "Client Picks", "Experiments"];
const nestedNames = ["Set A", "Set B", "Behind The Scenes", "Color Tests", "Long Exposure", "Verticals"];
const deepNames = ["Exports", "Source", "Selections"];
const imageTags = ["mocha", "private", "archive", "reference", "texture", "urban", "warm", "minimal"];
const videoUrl = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

const mediaCount = Number(process.env.SEED_EXPLORER_MEDIA_COUNT ?? 2500);
const fakeStoragePrefix = "fake-seed";

logger.info("seed.explorer_fake.started", {
  mediaCount
});

const deletedMedia = await db.delete(explorerMedia).where(eq(explorerMedia.source, "fake")).returning({ id: explorerMedia.id });
const deletedFolders = await db
  .delete(explorerFolders)
  .where(like(explorerFolders.storageKey, `${fakeStoragePrefix}/%`))
  .returning({ id: explorerFolders.id });

const folders: SeedFolder[] = [];

async function createFolder(name: string, parentId: string | null, path: string) {
  const [folder] = await db
    .insert(explorerFolders)
    .values({
      name,
      parentId,
      storageKey: path
    })
    .returning();

  if (!folder) {
    throw new Error(`Failed to seed folder ${path}`);
  }

  const seeded = {
    id: folder.id,
    name: folder.name,
    path
  };
  folders.push(seeded);
  return seeded;
}

for (const rootName of rootNames) {
  const root = await createFolder(rootName, null, `${fakeStoragePrefix}/${slug(rootName)}`);

  for (const childName of childNames) {
    const child = await createFolder(childName, root.id, `${root.path}/${slug(childName)}`);

    for (const nestedName of nestedNames) {
      const nested = await createFolder(nestedName, child.id, `${child.path}/${slug(nestedName)}`);

      for (const deepName of deepNames) {
        await createFolder(deepName, nested.id, `${nested.path}/${slug(deepName)}`);
      }
    }
  }
}

const now = Date.now();
const mediaRows = Array.from({ length: mediaCount }, (_, index) => {
  const folder = folders[index % folders.length];
  if (!folder) {
    throw new Error("No folders were seeded before creating fake media.");
  }
  const isVideo = index % 9 === 0;
  const imageId = 10 + (index % 950);
  const width = isVideo ? 1280 : 900 + (index % 5) * 180;
  const height = isVideo ? 720 : 700 + (index % 7) * 120;
  const createdAt = new Date(now - index * 86_400_000);
  const namePrefix = isVideo ? "clip" : "image";
  const name = `${namePrefix}-${folder.name.toLowerCase().replace(/\s+/g, "-")}-${String(index + 1).padStart(4, "0")}.${isVideo ? "mp4" : "jpg"}`;
  const imageUrl = `https://picsum.photos/id/${imageId}/${width}/${height}`;
  const previewUrl = `https://picsum.photos/id/${imageId}/720/480`;

  return {
    name,
    url: isVideo ? videoUrl : imageUrl,
    previewUrl,
    contentType: isVideo ? "video/mp4" : "image/jpeg",
    source: "fake",
    storageProvider: "remote",
    storageKey: `${fakeStoragePrefix}/media/${index + 1}`,
    storageResourceType: isVideo ? "video" : "image",
    size: isVideo ? 18_000_000 + index * 12_000 : 1_500_000 + index * 8_000,
    width,
    height,
    duration: isVideo ? 6 + (index % 48) : null,
    favorite: index % 13 === 0,
    folderId: folder.id,
    tags: [imageTags[index % imageTags.length]!, imageTags[(index + 3) % imageTags.length]!],
    createdAt,
    updatedAt: createdAt
  };
});

const batchSize = 250;
for (let index = 0; index < mediaRows.length; index += batchSize) {
  await db.insert(explorerMedia).values(mediaRows.slice(index, index + batchSize));
}

await sql`
  UPDATE explorer_folders folder
  SET cover_url = COALESCE((
    SELECT media.preview_url
    FROM explorer_media media
    WHERE media.folder_id = folder.id
    ORDER BY media.created_at DESC
    LIMIT 1
  ), '')
  WHERE folder.storage_key LIKE ${`${fakeStoragePrefix}/%`}
`;

logger.info("seed.explorer_fake.complete", {
  deletedFolders: deletedFolders.length,
  deletedMedia: deletedMedia.length,
  folders: folders.length,
  media: mediaRows.length
});

await sql.end();

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
