import type { ExplorerFolder } from "./types";

type FolderCardProps = {
  folder: ExplorerFolder;
  onOpen: (folderId: string) => void;
};

export function FolderCard({ folder, onOpen }: FolderCardProps) {
  return (
    <button className="explorer-folder-card" style={{ backgroundImage: `url(${folder.coverUrl})` }} type="button" onClick={() => onOpen(folder.id)}>
      <span>{folder.count}</span>
      <strong>{folder.name}</strong>
    </button>
  );
}
