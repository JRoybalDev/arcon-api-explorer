import { FiBox, FiChevronRight, FiFolder, FiHome } from "react-icons/fi";
import type { ExplorerFolder } from "./types";

type DirectoryProps = {
  activeFolderId: string | null;
  folders: ExplorerFolder[];
  storageUsed: number;
  storageTotal: number;
  totalItems: number;
  onFolderSelect: (folderId: string | null) => void;
};

export function Directory({ activeFolderId, folders, storageUsed, storageTotal, totalItems, onFolderSelect }: DirectoryProps) {
  const storagePercent = storageTotal > 0 ? Math.min(100, (storageUsed / storageTotal) * 100) : 0;

  return (
    <aside className="explorer-directory" aria-label="Media directory">
      <div className="explorer-directory__brand">
        <span aria-hidden>
          <FiBox />
        </span>
        <strong>ARCON</strong>
      </div>

      <nav className="explorer-directory__nav" aria-label="Folders">
        <button className={activeFolderId === null ? "active" : ""} type="button" onClick={() => onFolderSelect(null)}>
          <FiHome aria-hidden />
          <span>All Media</span>
          <small>{totalItems}</small>
        </button>
      </nav>

      <div className="explorer-directory__section-label">Folders</div>
      <div className="explorer-directory__folders">
        {folders.map((folder) => (
          <button className={activeFolderId === folder.id ? "active" : ""} key={folder.id} type="button" onClick={() => onFolderSelect(folder.id)}>
            <FiChevronRight aria-hidden />
            <FiFolder aria-hidden />
            <span>{folder.name}</span>
            <small>{folder.count}</small>
          </button>
        ))}
      </div>

      <div className="explorer-storage" aria-label="Storage usage">
        <div>
          <span>Storage</span>
          <strong>
            {formatBytes(storageUsed)} / {formatBytes(storageTotal)}
          </strong>
        </div>
        <div className="explorer-storage__bar" aria-hidden>
          <span style={{ width: `${storagePercent}%` }} />
        </div>
        <small>{storagePercent.toFixed(1)}% used</small>
      </div>
    </aside>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
