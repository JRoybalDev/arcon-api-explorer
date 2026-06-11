import { useRef, useState, type TouchEvent } from "react";
import { FiArrowLeft, FiCheckCircle, FiFolderPlus, FiHelpCircle, FiLogOut, FiMoreVertical, FiUpload } from "react-icons/fi";
import { FileCard } from "./FileCard";
import { FileViewerModal } from "./FileViewerModal";
import { FiltersSearch } from "./FiltersSearch";
import { FolderCard } from "./FolderCard";
import type { ExplorerFile, ExplorerFilter, ExplorerFolder, ExplorerSort, ExplorerView } from "./types";

type ContentAreaProps = {
  activeFolder: ExplorerFolder | null;
  autoEnabled: boolean;
  favoriteIds: string[];
  files: ExplorerFile[];
  filter: ExplorerFilter;
  folders: ExplorerFolder[];
  isLoadingFiles: boolean;
  loopEnabled: boolean;
  searchQuery: string;
  selectedFile: ExplorerFile | null;
  sort: ExplorerSort;
  view: ExplorerView;
  onAutoToggle: () => void;
  onFavoriteToggle: (fileId: string) => void;
  onFolderBack: () => void;
  onFilterChange: (filter: ExplorerFilter) => void;
  onFolderCreate: () => void;
  onFolderOpen: (folderId: string) => void;
  onLock: () => void;
  onLoopToggle: () => void;
  onModalClose: () => void;
  onRandomFile: () => void;
  onSelectedFileChange: (fileId: string) => void;
  onSearchChange: (query: string) => void;
  onShuffleFiles: () => void;
  onSortChange: (sort: ExplorerSort) => void;
  onUploadOpen: () => void;
  onViewChange: (view: ExplorerView) => void;
};

export function ContentArea({
  activeFolder,
  autoEnabled,
  favoriteIds,
  files,
  filter,
  folders,
  isLoadingFiles,
  loopEnabled,
  searchQuery,
  selectedFile,
  sort,
  view,
  onAutoToggle,
  onFavoriteToggle,
  onFolderBack,
  onFilterChange,
  onFolderCreate,
  onFolderOpen,
  onLock,
  onLoopToggle,
  onModalClose,
  onRandomFile,
  onSelectedFileChange,
  onSearchChange,
  onShuffleFiles,
  onSortChange,
  onUploadOpen,
  onViewChange
}: ContentAreaProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

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
          <strong>{activeFolder?.name ?? "All Media"}</strong>
        </div>
        <div className="explorer-topbar__actions">
          <button className="explorer-upload-button" type="button" onClick={onUploadOpen}>
            <FiUpload aria-hidden /> Upload
          </button>
          <button className="explorer-icon-button" type="button" onClick={onFolderCreate} title="Create folder" aria-label="Create folder">
            <FiFolderPlus aria-hidden />
          </button>
          <div className="explorer-menu">
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
                    { label: "Videos", value: "video" as const }
                  ].map((option) => (
                    <button key={option.value} type="button" role="menuitemradio" aria-checked={filter === option.value} onClick={() => onFilterChange(option.value)}>
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
                    <button key={option.value} type="button" role="menuitemradio" aria-checked={sort === option.value} onClick={() => onSortChange(option.value)}>
                      {option.label}
                      {sort === option.value ? <FiCheckCircle aria-hidden /> : null}
                    </button>
                  ))}
                </div>

                <button className="explorer-menu__item" type="button" role="menuitem">
                  Select Items
                  <FiCheckCircle aria-hidden />
                </button>

                <div className="explorer-menu__group">
                  <span>Settings</span>
                  <button type="button" role="menuitem" onClick={onLock}>
                    Sign out
                    <FiLogOut aria-hidden />
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <FiltersSearch
        onSearchChange={onSearchChange}
        onViewChange={onViewChange}
        searchQuery={searchQuery}
        view={view}
      />

      <main className="explorer-main">
        {folders.length > 0 && view !== "list" ? (
          <section className="explorer-section" aria-labelledby="explorer-folders-heading">
            <div className="explorer-section__label" id="explorer-folders-heading">
              Folders <span>{folders.length}</span>
            </div>
            <div className={`explorer-folder-grid explorer-folder-grid--${view}`}>
              {folders.map((folder) => (
                <FolderCard folder={folder} key={folder.id} onOpen={onFolderOpen} />
              ))}
            </div>
          </section>
        ) : null}

        <section className="explorer-section" aria-labelledby="explorer-files-heading">
          <div className="explorer-section__label" id="explorer-files-heading">
            Files <span>{files.length}</span>
          </div>
          {isLoadingFiles ? <p className="explorer-empty">Loading files...</p> : null}
          {!isLoadingFiles && files.length === 0 ? <p className="explorer-empty">No files match this view.</p> : null}
          {view === "list" && files.length > 0 ? (
            <div className="explorer-list-head" aria-hidden>
              <span>Name</span>
              <span>Folder</span>
              <span>Size</span>
              <span>Date</span>
            </div>
          ) : null}
          <div className={`explorer-file-grid explorer-file-grid--${view}`}>
            {files.map((file) => (
              <FileCard file={file} key={file.id} onOpen={onSelectedFileChange} view={view} />
            ))}
          </div>
        </section>
      </main>

      <button className="explorer-help-button" type="button" aria-label="Help">
        <FiHelpCircle aria-hidden />
      </button>

      {selectedFile ? (
        <FileViewerModal
          autoEnabled={autoEnabled}
          favoriteIds={favoriteIds}
          file={selectedFile}
          files={files}
          loopEnabled={loopEnabled}
          onAutoToggle={onAutoToggle}
          onClose={onModalClose}
          onFavoriteToggle={onFavoriteToggle}
          onLoopToggle={onLoopToggle}
          onNavigate={onSelectedFileChange}
          onRandom={onRandomFile}
          onShuffle={onShuffleFiles}
        />
      ) : null}
    </section>
  );
}
