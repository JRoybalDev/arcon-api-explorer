import { useEffect, useMemo, useState } from "react";
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
  const [openFolderIds, setOpenFolderIds] = useState<string[]>([]);
  const rootFolders = useMemo(() => folders.filter((folder) => folder.parentId === null), [folders]);
  const childFoldersByParent = useMemo(
    () =>
      folders.reduce<Record<string, ExplorerFolder[]>>((groups, folder) => {
        if (folder.parentId) {
          groups[folder.parentId] = [...(groups[folder.parentId] ?? []), folder];
        }

        return groups;
      }, {}),
    [folders]
  );

  useEffect(() => {
    if (!activeFolderId) {
      return;
    }

    const parentIds: string[] = [];
    let currentFolder = folders.find((folder) => folder.id === activeFolderId);

    while (currentFolder?.parentId) {
      parentIds.push(currentFolder.parentId);
      currentFolder = folders.find((folder) => folder.id === currentFolder?.parentId);
    }

    if (parentIds.length > 0) {
      setOpenFolderIds((currentIds) => Array.from(new Set([...currentIds, ...parentIds])));
    }
  }, [activeFolderId, folders]);

  function toggleFolder(folder: ExplorerFolder) {
    const childFolders = childFoldersByParent[folder.id] ?? [];
    const isOpen = openFolderIds.includes(folder.id);

    onFolderSelect(folder.id);

    if (childFolders.length === 0) {
      return;
    }

    setOpenFolderIds((currentIds) => {
      if (!isOpen) {
        const associatedFolderIds = new Set([...getAncestorFolderIds(folder.id), folder.id]);
        return Array.from(associatedFolderIds);
      }

      const closingFolderIds = new Set([folder.id, ...getDescendantFolderIds(folder.id)]);
      return currentIds.filter((folderId) => !closingFolderIds.has(folderId));
    });
  }

  function getDescendantFolderIds(folderId: string): string[] {
    const childFolders = childFoldersByParent[folderId] ?? [];

    return childFolders.flatMap((childFolder) => [childFolder.id, ...getDescendantFolderIds(childFolder.id)]);
  }

  function getAncestorFolderIds(folderId: string): string[] {
    const ancestorIds: string[] = [];
    let currentFolder = folders.find((candidate) => candidate.id === folderId);

    while (currentFolder?.parentId) {
      ancestorIds.unshift(currentFolder.parentId);
      currentFolder = folders.find((candidate) => candidate.id === currentFolder?.parentId);
    }

    return ancestorIds;
  }

  function renderFolderBranch(folder: ExplorerFolder) {
    const childFolders = childFoldersByParent[folder.id] ?? [];
    const isOpen = openFolderIds.includes(folder.id);
    const hasChildren = childFolders.length > 0;

    return (
      <div className="explorer-directory__accordion" key={folder.id}>
        <button aria-expanded={hasChildren ? isOpen : undefined} className={activeFolderId === folder.id ? "active" : ""} type="button" onClick={() => toggleFolder(folder)}>
          <FiChevronRight aria-hidden className={`explorer-directory__chevron${isOpen ? " is-open" : ""}${hasChildren ? "" : " is-empty"}`} />
          <FiFolder aria-hidden />
          <span>{folder.name}</span>
        </button>

        {isOpen && hasChildren ? <div className="explorer-directory__subfolders">{childFolders.map((childFolder) => renderFolderBranch(childFolder))}</div> : null}
      </div>
    );
  }

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
        {rootFolders.map((folder) => renderFolderBranch(folder))}
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
