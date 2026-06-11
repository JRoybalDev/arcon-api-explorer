import { motion } from "framer-motion";
import type { ExplorerFolder } from "./types";

type FolderCardProps = {
  folder: ExplorerFolder;
  onOpen: (folderId: string) => void;
};

export function FolderCard({ folder, onOpen }: FolderCardProps) {
  return (
    <motion.button
      className="explorer-folder-card"
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "40px" }}
      whileHover={{ y: -3, scale: 1.01 }}
      whileTap={{ scale: 0.985 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      type="button"
      onClick={() => onOpen(folder.id)}
    >
      <img alt="" src={folder.coverUrl} />
      <span>{folder.count}</span>
      <strong>{folder.name}</strong>
    </motion.button>
  );
}
