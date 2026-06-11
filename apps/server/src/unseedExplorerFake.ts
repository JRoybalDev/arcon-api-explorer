import { eq, like } from "drizzle-orm";
import { explorerFolders, explorerMedia } from "../db/schema";
import { db, sql } from "./db";
import { logger } from "./logger";

const fakeStoragePrefix = "fake-seed";

logger.info("unseed.explorer_fake.started");

const deletedMedia = await db.delete(explorerMedia).where(eq(explorerMedia.source, "fake")).returning({ id: explorerMedia.id });
const deletedFolders = await db
  .delete(explorerFolders)
  .where(like(explorerFolders.storageKey, `${fakeStoragePrefix}/%`))
  .returning({ id: explorerFolders.id });

logger.info("unseed.explorer_fake.complete", {
  folders: deletedFolders.length,
  media: deletedMedia.length
});

await sql.end();
