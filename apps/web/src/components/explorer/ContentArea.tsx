import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type TouchEvent } from "react";
import { FiArrowLeft, FiCheck, FiCheckCircle, FiChevronRight, FiFolder, FiFolderPlus, FiHelpCircle, FiHome, FiMoreVertical, FiMove, FiSettings, FiTrash2, FiUpload, FiX } from "react-icons/fi";
import { FileCard } from "./FileCard";
import { FileViewerModal } from "./FileViewerModal";
import { FiltersSearch } from "./FiltersSearch";
import { FolderCard } from "./FolderCard";
import type { ExplorerFile, ExplorerFilter, ExplorerFolder, ExplorerSort, ExplorerView } from "./types";

type ContentAreaProps = {
  activeFolder: ExplorerFolder | null;
  allFolders: ExplorerFolder[];
  autoEnabled: boolean;
  favoriteIds: string[];
  files: ExplorerFile[];
  filter: ExplorerFilter;
  folders: ExplorerFolder[];
  isLoadingFiles: boolean;
  isLoadingMoreFiles?: boolean;
  loopEnabled: boolean;
  searchQuery: string;
  selectedFile: ExplorerFile | null;
  selectedFileIndex: number;
  shuffleEnabled: boolean;
  sort: ExplorerSort;
  totalFiles?: number;
  view: ExplorerView;
  canLoadMoreFiles?: boolean;
  onAutoToggle: () => void;
  onFavoriteToggle: (fileId: string) => void;
  onFileTagsChange: (fileId: string, tags: string[]) => void;
  onFolderBack: () => void;
  onFilterChange: (filter: ExplorerFilter) => void;
  onFilesDelete: (fileIds: string[]) => void;
  onFilesMove: (fileIds: string[], folderId: string | null) => void;
  onFolderCreate: (folderName: string) => void;
  onFolderOpen: (folderId: string | null) => void;
  onLoopToggle: () => void;
  onLoadMoreFiles?: () => void;
  onMediaPageSizeChange?: (pageSize: number) => void;
  onModalClose: () => void;
  onRandomFile: () => void;
  onSelectedFileChange: (fileId: string) => void;
  onSearchChange: (query: string) => void;
  onSettingsOpen: () => void;
  onShuffleFiles: () => void;
  onSortChange: (sort: ExplorerSort) => void;
  onUploadOpen: () => void;
  onViewChange: (view: ExplorerView) => void;
  onViewerNavigateByOffset: (offset: number) => void;
};

export function ContentArea({
  activeFolder,
  allFolders,
  autoEnabled,
  favoriteIds,
  files,
  filter,
  folders,
  isLoadingFiles,
  isLoadingMoreFiles = false,
  loopEnabled,
  searchQuery,
  selectedFile,
  selectedFileIndex,
  shuffleEnabled,
  sort,
  totalFiles,
  view,
  canLoadMoreFiles = false,
  onAutoToggle,
  onFavoriteToggle,
  onFileTagsChange,
  onFolderBack,
  onFilterChange,
  onFilesDelete,
  onFilesMove,
  onFolderCreate,
  onFolderOpen,
  onLoopToggle,
  onLoadMoreFiles,
  onMediaPageSizeChange,
  onModalClose,
  onRandomFile,
  onSelectedFileChange,
  onSearchChange,
  onSettingsOpen,
  onShuffleFiles,
  onSortChange,
  onUploadOpen,
  onViewChange,
  onViewerNavigateByOffset
}: ContentAreaProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [bulkDialog, setBulkDialog] = useState<"move" | "delete" | null>(null);
  const [moveFolderId, setMoveFolderId] = useState<string | null>(activeFolder?.id ?? null);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const fileGridRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const infiniteLoaderRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const selectedCount = selectedFileIds.length;
  const moveFolderName = moveFolderId ? allFolders.find((folder) => folder.id === moveFolderId)?.name ?? "Selected folder" : "All Media";
  const breadcrumbFolders = useMemo(() => {
    if (!activeFolder) {
      return [];
    }

    const foldersById = new Map(allFolders.map((folder) => [folder.id, folder]));
    const trail: ExplorerFolder[] = [];
    let currentFolder: ExplorerFolder | undefined = activeFolder;

    while (currentFolder) {
      trail.unshift(currentFolder);
      currentFolder = currentFolder.parentId ? foldersById.get(currentFolder.parentId) : undefined;
    }

    return trail;
  }, [activeFolder, allFolders]);
  const folderTree = useMemo(() => buildFolderTree(allFolders), [allFolders]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    function closeOnOutsidePointer(event: PointerEvent) {
      if (menuRef.current?.contains(event.target as Node)) {
        return;
      }

      setMenuOpen(false);
    }

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [menuOpen]);

  useEffect(() => {
    setSelectedFileIds((current) => current.filter((fileId) => files.some((file) => file.id === fileId)));
  }, [files]);

  useEffect(() => {
    setMoveFolderId(activeFolder?.id ?? null);
  }, [activeFolder]);

  useEffect(() => {
    const grid = fileGridRef.current;

    if (!grid || !onMediaPageSizeChange) {
      return;
    }

    const measuredGrid = grid;
    const updateMeasuredPageSize = onMediaPageSizeChange;

    function updatePageSize() {
      const columns = window.getComputedStyle(measuredGrid).gridTemplateColumns.split(" ").filter(Boolean).length || 1;
      updateMeasuredPageSize(Math.max(20, columns * 20));
    }

    updatePageSize();
    const resizeObserver = new ResizeObserver(updatePageSize);
    resizeObserver.observe(measuredGrid);
    return () => resizeObserver.disconnect();
  }, [onMediaPageSizeChange, view]);

  useEffect(() => {
    const loader = infiniteLoaderRef.current;

    if (!loader || !canLoadMoreFiles || isLoadingFiles || isLoadingMoreFiles || !onLoadMoreFiles) {
      return;
    }

    const loadMoreFiles = onLoadMoreFiles;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          loadMoreFiles();
        }
      },
      {
        root: loader.closest(".explorer-main"),
        rootMargin: "720px 0px 720px 0px",
        threshold: 0
      }
    );

    observer.observe(loader);
    return () => observer.disconnect();
  }, [canLoadMoreFiles, files.length, isLoadingFiles, isLoadingMoreFiles, onLoadMoreFiles]);

  function cancelFolderCreate() {
    setCreateFolderOpen(false);
    setFolderName("");
  }

  function submitFolderCreate() {
    const nextFolderName = folderName.trim();

    if (!nextFolderName) {
      return;
    }

    onFolderCreate(nextFolderName);
    cancelFolderCreate();
  }

  function selectFilter(nextFilter: ExplorerFilter) {
    onFilterChange(nextFilter);
    setMenuOpen(false);
  }

  function selectSort(nextSort: ExplorerSort) {
    onSortChange(nextSort);
    setMenuOpen(false);
  }

  function selectItems() {
    setSelectionMode(true);
    setSelectedFileIds([]);
    setMenuOpen(false);
  }

  function cancelSelection() {
    setSelectionMode(false);
    setSelectedFileIds([]);
    setBulkDialog(null);
  }

  function toggleFileSelection(fileId: string) {
    setSelectedFileIds((current) => (current.includes(fileId) ? current.filter((id) => id !== fileId) : [...current, fileId]));
  }

  function openBulkDialog(nextDialog: "move" | "delete") {
    if (selectedCount === 0) {
      return;
    }

    setBulkDialog(nextDialog);
  }

  function confirmDeleteFiles() {
    onFilesDelete(selectedFileIds);
    cancelSelection();
  }

  function confirmMoveFiles() {
    onFilesMove(selectedFileIds, moveFolderId);
    cancelSelection();
  }

  function closeOnBackdropClick(event: MouseEvent<HTMLDivElement>, close: () => void) {
    if (event.target === event.currentTarget) {
      close();
    }
  }

  function openSettings() {
    onSettingsOpen();
    setMenuOpen(false);
  }

  function handleTouchStart(event: TouchEvent<HTMLElement>) {
    touchStartX.current = event.touches[0]?.clientX ?? null;
    touchStartY.current = event.touches[0]?.clientY ?? null;
  }

  function handleTouchEnd(event: TouchEvent<HTMLElement>) {
    if (touchStartX.current === null || touchStartY.current === null) {
      return;
    }

    const touch = event.changedTouches[0];
    const deltaX = (touch?.clientX ?? 0) - touchStartX.current;
    const deltaY = Math.abs((touch?.clientY ?? 0) - touchStartY.current);

    touchStartX.current = null;
    touchStartY.current = null;

    if (deltaX > 70 && deltaY < 55) {
      onFolderBack();
    }
  }

  return (
    <section className="explorer-content" aria-label="Media explorer" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <header className="explorer-topbar">
        <div className="explorer-breadcrumb">
          <button className="explorer-back-button" type="button" onClick={onFolderBack} aria-label="Go up one folder">
            <FiArrowLeft aria-hidden />
          </button>
          <strong className="explorer-breadcrumb__mobile-title">{activeFolder?.name ?? "All Media"}</strong>
          <nav className="explorer-breadcrumb__trail" aria-label="Current folder">
            <button type="button" onClick={() => onFolderOpen(null)}>
              <FiHome aria-hidden />
              Home
            </button>
            {breadcrumbFolders.map((folder) => (
              <span className="explorer-breadcrumb__segment" key={folder.id}>
                <FiChevronRight aria-hidden />
                <button type="button" onClick={() => onFolderOpen(folder.id)} aria-current={folder.id === activeFolder?.id ? "page" : undefined}>
                  {folder.name}
                </button>
              </span>
            ))}
          </nav>
        </div>
        <div className="explorer-topbar__actions">
          {createFolderOpen ? (
            <div className="explorer-create-folder-inline">
              <input autoFocus placeholder="Folder name" value={folderName} onChange={(event) => setFolderName(event.target.value)} onKeyDown={(event) => {
                if (event.key === "Enter") {
                  submitFolderCreate();
                }

                if (event.key === "Escape") {
                  cancelFolderCreate();
                }
              }} />
              <button type="button" onClick={submitFolderCreate}>
                Create
              </button>
              <button type="button" onClick={cancelFolderCreate}>
                Cancel
              </button>
            </div>
          ) : (
            <>
              <button className="explorer-upload-button" type="button" onClick={onUploadOpen}>
                <FiUpload aria-hidden /> Upload
              </button>
              <button className="explorer-icon-button" type="button" onClick={() => setCreateFolderOpen(true)} title="Create folder" aria-label="Create folder">
                <FiFolderPlus aria-hidden />
              </button>
            </>
          )}
          <button className="explorer-icon-button explorer-settings-button" type="button" onClick={openSettings} title="Settings" aria-label="Settings">
            <FiSettings aria-hidden />
          </button>
          <div className="explorer-menu" ref={menuRef}>
            <button
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              className="explorer-icon-button"
              type="button"
              onClick={() => setMenuOpen((current) => !current)}
              title="Explorer options"
              aria-label="Explorer options"
            >
              <FiMoreVertical aria-hidden />
            </button>
            {menuOpen ? (
              <div className="explorer-menu__panel" role="menu">
                <div className="explorer-menu__group">
                  <span>Filter</span>
                  {[
                    { label: "All Media", value: "all" as const },
                    { label: "Images", value: "image" as const },
                    { label: "Videos", value: "video" as const },
                    { label: "Mixed", value: "mixed" as const }
                  ].map((option) => (
                    <button key={option.value} type="button" role="menuitemradio" aria-checked={filter === option.value} onClick={() => selectFilter(option.value)}>
                      {option.label}
                      {filter === option.value ? <FiCheckCircle aria-hidden /> : null}
                    </button>
                  ))}
                </div>

                <div className="explorer-menu__group">
                  <span>Sort By</span>
                  {[
                    { label: "Date (Newest)", value: "newest" as const },
                    { label: "Date (Oldest)", value: "oldest" as const },
                    { label: "Name (A-Z)", value: "name" as const }
                  ].map((option) => (
                    <button key={option.value} type="button" role="menuitemradio" aria-checked={sort === option.value} onClick={() => selectSort(option.value)}>
                      {option.label}
                      {sort === option.value ? <FiCheckCircle aria-hidden /> : null}
                    </button>
                  ))}
                </div>

                <button className="explorer-menu__item" type="button" role="menuitem" onClick={selectItems}>
                  Select Items
                  <FiCheckCircle aria-hidden />
                </button>

                <div className="explorer-menu__group">
                  <span>Settings</span>
                  <button type="button" role="menuitem" onClick={openSettings}>
                    Settings
                    <FiSettings aria-hidden />
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <FiltersSearch
        filter={filter}
        onFilterChange={onFilterChange}
        onSearchChange={onSearchChange}
        onSelectItems={selectItems}
        onSortChange={onSortChange}
        onViewChange={onViewChange}
        searchQuery={searchQuery}
        sort={sort}
        view={view}
      />

      <main className="explorer-main">
        {selectionMode ? (
          <div className="explorer-selection-bar" role="status">
            <strong>{selectedCount} selected</strong>
            <div>
              <button type="button" onClick={() => openBulkDialog("move")} disabled={selectedCount === 0}>
                <FiMove aria-hidden /> Move
              </button>
              <button className="explorer-selection-bar__danger" type="button" onClick={() => openBulkDialog("delete")} disabled={selectedCount === 0}>
                <FiTrash2 aria-hidden /> Delete
              </button>
              <button type="button" onClick={cancelSelection}>
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {isLoadingFiles ? (
          <section className="explorer-section" aria-live="polite" aria-busy="true">
            <div className="explorer-section__label">Loading…</div>
            <div className="explorer-loading">
              <div className={`explorer-folder-grid explorer-folder-grid--${view}`} aria-hidden>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="explorer-folder-card explorer-folder-card--skeleton" />
                ))}
              </div>

              <div className={`explorer-file-grid explorer-file-grid--${view}`} ref={fileGridRef} aria-hidden>
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="explorer-file-card explorer-file-card--skeleton" />
                ))}
              </div>
            </div>
          </section>
        ) : (
          <>
            {folders.length > 0 ? (
              <section className="explorer-section" aria-labelledby="explorer-folders-heading">
                <div className="explorer-section__label" id="explorer-folders-heading">
                  Folders <span>{folders.length}</span>
                </div>
                <div className={`explorer-folder-grid explorer-folder-grid--${view}`}>
                  {folders.map((folder) => (
                    <FolderCard folder={folder} key={folder.id} onOpen={onFolderOpen} filter={filter} sort={sort} />
                  ))}
                </div>
              </section>
            ) : null}

            <section className="explorer-section" aria-labelledby="explorer-files-heading">
              <div className="explorer-section__label" id="explorer-files-heading">
                Files <span>{totalFiles ?? files.length}</span>
              </div>
              {!isLoadingFiles && files.length === 0 ? <p className="explorer-empty">No files match this view.</p> : null}
              {view === "list" && files.length > 0 ? (
                <div className="explorer-list-head" aria-hidden>
                  <span>Name</span>
                  <span>Folder</span>
                  <span>Size</span>
                  <span>Date</span>
                </div>
              ) : null}
              <div className={`explorer-file-grid explorer-file-grid--${view}`} ref={fileGridRef}>
                {files.map((file) => (
                  <FileCard
                    file={file}
                    isSelected={selectedFileIds.includes(file.id)}
                    isSelectionMode={selectionMode}
                    key={file.id}
                    onOpen={onSelectedFileChange}
                    onSelectToggle={toggleFileSelection}
                    view={view}
                  />
                ))}
              </div>
              {canLoadMoreFiles ? (
                <div className="explorer-infinite-loader" ref={infiniteLoaderRef} role="status" aria-live="polite">
                  <span aria-hidden />
                  {isLoadingMoreFiles ? "Loading more..." : "Scroll for more"}
                </div>
              ) : null}
            </section>
          </>
        )}
      </main>

      <button className="explorer-help-button" type="button" aria-label="Help">
        <FiHelpCircle aria-hidden />
      </button>

      {createFolderOpen ? (
        <div className="explorer-create-folder-modal" role="dialog" aria-modal="true" aria-label="Create folder" onClick={(event) => closeOnBackdropClick(event, cancelFolderCreate)}>
          <div className="explorer-create-folder-modal__panel" onClick={(event) => event.stopPropagation()}>
            <header>
              <div>
                <h2>Create Folder</h2>
                <p>{activeFolder ? `Inside ${activeFolder.name}` : "Inside All Media"}</p>
              </div>
              <button type="button" onClick={cancelFolderCreate} aria-label="Close create folder modal">
                <FiX aria-hidden />
              </button>
            </header>
            <label>
              <span>Folder Name</span>
              <input autoFocus placeholder="New folder" value={folderName} onChange={(event) => setFolderName(event.target.value)} />
            </label>
            <footer>
              <button type="button" onClick={cancelFolderCreate}>
                Cancel
              </button>
              <button type="button" onClick={submitFolderCreate}>
                Create
              </button>
            </footer>
          </div>
        </div>
      ) : null}

      {bulkDialog === "delete" ? (
        <div className="explorer-bulk-modal" role="dialog" aria-modal="true" aria-labelledby="explorer-delete-title" onClick={(event) => closeOnBackdropClick(event, () => setBulkDialog(null))}>
          <div className="explorer-bulk-modal__panel explorer-bulk-modal__panel--small" onClick={(event) => event.stopPropagation()}>
            <header>
              <h2 id="explorer-delete-title">Delete {selectedCount} item{selectedCount === 1 ? "" : "s"}?</h2>
              <button type="button" onClick={() => setBulkDialog(null)} aria-label="Close delete confirmation">
                <FiX aria-hidden />
              </button>
            </header>
            <p>These files will be removed from the explorer view.</p>
            <footer>
              <button type="button" onClick={() => setBulkDialog(null)}>
                Cancel
              </button>
              <button className="explorer-bulk-modal__danger" type="button" onClick={confirmDeleteFiles}>
                Delete
              </button>
            </footer>
          </div>
        </div>
      ) : null}

      {bulkDialog === "move" ? (
        <div className="explorer-bulk-modal" role="dialog" aria-modal="true" aria-labelledby="explorer-move-title" onClick={(event) => closeOnBackdropClick(event, () => setBulkDialog(null))}>
          <div className="explorer-bulk-modal__panel" onClick={(event) => event.stopPropagation()}>
            <header>
              <h2 id="explorer-move-title">Move {selectedCount} item{selectedCount === 1 ? "" : "s"} to...</h2>
              <button type="button" onClick={() => setBulkDialog(null)} aria-label="Close move dialog">
                <FiX aria-hidden />
              </button>
            </header>
            <div className="explorer-move-tree" role="tree" aria-label="Folder destinations">
              <MoveFolderRow depth={0} folder={null} isSelected={moveFolderId === null} label="All Media" onSelect={() => setMoveFolderId(null)} />
              {folderTree.map((folder) => (
                <MoveFolderBranch depth={0} folder={folder} key={folder.id} selectedFolderId={moveFolderId} onSelect={setMoveFolderId} />
              ))}
            </div>
            <button className="explorer-move-new-folder" type="button" onClick={() => {
              setBulkDialog(null);
              setCreateFolderOpen(true);
            }}>
              <FiFolderPlus aria-hidden /> New Folder in "{moveFolderName}"
            </button>
            <footer>
              <button type="button" onClick={() => setBulkDialog(null)}>
                Cancel
              </button>
              <button type="button" onClick={confirmMoveFiles}>
                Move Here
              </button>
            </footer>
          </div>
        </div>
      ) : null}

      {selectedFile ? (
        <FileViewerModal
          autoEnabled={autoEnabled}
          favoriteIds={favoriteIds}
          file={selectedFile}
          files={files}
          fileIndex={selectedFileIndex}
          loopEnabled={loopEnabled}
          shuffleEnabled={shuffleEnabled}
          totalFiles={totalFiles ?? files.length}
          onAutoToggle={onAutoToggle}
          onClose={onModalClose}
          onFavoriteToggle={onFavoriteToggle}
          onTagsChange={onFileTagsChange}
          onLoopToggle={onLoopToggle}
          onNavigateByOffset={onViewerNavigateByOffset}
          onRandom={onRandomFile}
          onShuffle={onShuffleFiles}
        />
      ) : null}
    </section>
  );
}

type FolderTreeNode = ExplorerFolder & {
  children: FolderTreeNode[];
};

type MoveFolderBranchProps = {
  depth: number;
  folder: FolderTreeNode;
  selectedFolderId: string | null;
  onSelect: (folderId: string) => void;
};

function MoveFolderBranch({ depth, folder, selectedFolderId, onSelect }: MoveFolderBranchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const hasChildren = folder.children.length > 0;

  return (
    <>
      <MoveFolderRow
        depth={depth}
        folder={folder}
        isOpen={isOpen}
        isSelected={selectedFolderId === folder.id}
        label={folder.name}
        onSelect={() => onSelect(folder.id)}
        onToggle={hasChildren ? () => setIsOpen((current) => !current) : undefined}
      />
      {hasChildren && isOpen
        ? folder.children.map((child) => <MoveFolderBranch depth={depth + 1} folder={child} key={child.id} selectedFolderId={selectedFolderId} onSelect={onSelect} />)
        : null}
    </>
  );
}

type MoveFolderRowProps = {
  depth: number;
  folder: ExplorerFolder | null;
  isOpen?: boolean;
  isSelected: boolean;
  label: string;
  onSelect: () => void;
  onToggle?: () => void;
};

function MoveFolderRow({ depth, folder, isOpen = false, isSelected, label, onSelect, onToggle }: MoveFolderRowProps) {
  return (
    <div className="explorer-move-tree__row" role="treeitem" aria-selected={isSelected} style={{ paddingLeft: `${depth * 18 + 6}px` } as CSSProperties}>
      <button className="explorer-move-tree__twist" type="button" onClick={onToggle ?? onSelect} aria-label={onToggle ? `${isOpen ? "Collapse" : "Expand"} ${label}` : `Select ${label}`}>
        {onToggle ? <FiChevronRight aria-hidden className={isOpen ? "is-open" : ""} /> : null}
      </button>
      <button className="explorer-move-tree__folder" type="button" onClick={onSelect}>
        {isSelected ? <FiCheck aria-hidden /> : <FiFolder aria-hidden />}
        <span>{folder?.name ?? label}</span>
      </button>
    </div>
  );
}

function buildFolderTree(folders: ExplorerFolder[]): FolderTreeNode[] {
  const nodes = new Map<string, FolderTreeNode>();
  const roots: FolderTreeNode[] = [];

  folders.forEach((folder) => {
    nodes.set(folder.id, { ...folder, children: [] });
  });

  nodes.forEach((node) => {
    if (node.parentId && nodes.has(node.parentId)) {
      nodes.get(node.parentId)?.children.push(node);
      return;
    }

    roots.push(node);
  });

  return sortFolderNodes(roots);
}

function sortFolderNodes(nodes: FolderTreeNode[]): FolderTreeNode[] {
  return nodes
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((node) => ({
      ...node,
      children: sortFolderNodes(node.children)
    }));
}
