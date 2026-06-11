import { motion } from "framer-motion";
import { FiFile, FiFolder } from "react-icons/fi";
import type { ExplorerFolder } from "./types";

type FolderCardProps = {
  folder: ExplorerFolder;
  onOpen: (folderId: string) => void;
};

export function FolderCard({ folder, onOpen }: FolderCardProps) {
  const itemCount = folder.itemCount ?? folder.count;
  const folderCount = folder.folderCount ?? 0;

  return (
    <motion.button
      className={`explorer-folder-card${folder.coverUrl ? "" : " explorer-folder-card--empty"}`}
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "40px" }}
      whileHover={{ y: -3, scale: 1.01 }}
      whileTap={{ scale: 0.985 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      type="button"
      onClick={() => onOpen(folder.id)}
    >
      {folder.coverUrl ? <img alt="" src={folder.coverUrl} /> : <span className="explorer-folder-card__placeholder" aria-hidden><FiFolder /></span>}
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
