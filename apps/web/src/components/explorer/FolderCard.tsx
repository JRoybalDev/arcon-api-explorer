import { motion } from "framer-motion";
import { FiFile, FiFolder } from "react-icons/fi";
import { useEffect, useState } from "react";
import { apiClient } from "../../shared/apiClient";
import { useAdminSession } from "../../shared/useAdminSession";
import { folderThumbnailUrl, type ExplorerFolder, type ExplorerFilter, type ExplorerSort } from "./types";

type FolderCardProps = {
  folder: ExplorerFolder;
  onOpen: (folderId: string) => void;
  filter?: ExplorerFilter;
  sort?: ExplorerSort;
};

export function FolderCard({ folder, onOpen }: FolderCardProps) {
  const itemCount = folder.itemCount ?? folder.count;
  const folderCount = folder.folderCount ?? 0;
  const adminSession = useAdminSession();
  const [thumbUrl, setThumbUrl] = useState<string | null>(folderThumbnailUrl(folder.coverUrl) || null);

  useEffect(() => {
    if (thumbUrl) return;
    if (!adminSession.isUnlocked) return;

    let canceled = false;

    (async () => {
      try {
        const response = await apiClient.explorer.contents(adminSession.adminKey, { folderId: folder.id, limit: 1 });
        const [media] = response.media;

        if (canceled) return;
        if (media) {
          setThumbUrl(folderThumbnailUrl(media.previewUrl || ""));
        }
      } catch {
        // ignore
      }
    })();

    return () => {
      canceled = true;
    };
  }, [adminSession, folder.id, thumbUrl]);

  return (
    <motion.button
      className={`explorer-folder-card${thumbUrl ? "" : " explorer-folder-card--empty"}`}
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "40px" }}
      whileHover={{ y: -3, scale: 1.01 }}
      whileTap={{ scale: 0.985 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      type="button"
      onClick={() => onOpen(folder.id)}
    >
      {thumbUrl ? <img alt="" src={thumbUrl} onError={() => setThumbUrl(null)} /> : <span className="explorer-folder-card__placeholder" aria-hidden><FiFolder /></span>}
      <span className="explorer-folder-card__count" aria-label={`${itemCount} items${folderCount > 0 ? `, ${folderCount} folders` : ""}`}>
        <span className="explorer-folder-card__count-text">{itemCount} items{folderCount > 0 ? ` | ${folderCount} folders` : ""}</span>
        <span className="explorer-folder-card__count-mobile" aria-hidden>
          <span><FiFile /> {itemCount}</span>
          {folderCount > 0 ? <span><FiFolder /> {folderCount}</span> : null}
        </span>
      </span>
      <strong>{folder.name}</strong>
    </motion.button>
  );
}
