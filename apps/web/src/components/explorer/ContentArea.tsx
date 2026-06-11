import { FiChevronRight, FiFolder, FiHelpCircle, FiHome, FiLogOut, FiUpload } from "react-icons/fi";
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
  folderPath: ExplorerFolder[];
  folders: ExplorerFolder[];
  isLoadingFiles: boolean;
  loopEnabled: boolean;
  searchQuery: string;
  selectedFile: ExplorerFile | null;
  sort: ExplorerSort;
  view: ExplorerView;
  onAutoToggle: () => void;
  onFavoriteToggle: (fileId: string) => void;
  onFilterChange: (filter: ExplorerFilter) => void;
  onFolderOpen: (folderId: string) => void;
  onHomeOpen: () => void;
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
  folderPath,
  folders,
  isLoadingFiles,
  loopEnabled,
  searchQuery,
  selectedFile,
  sort,
  view,
  onAutoToggle,
  onFavoriteToggle,
  onFilterChange,
  onFolderOpen,
  onHomeOpen,
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
  const visibleFolderCount = activeFolder ? 0 : folders.length;
  const totalItems = visibleFolderCount + files.length;

  return (
    <section className="explorer-content" aria-label="Media explorer">
      <header className="explorer-topbar">
        <div className="explorer-breadcrumb">
          <FiHome aria-hidden />
          <button type="button" onClick={onHomeOpen}>
            Home
          </button>
          {folderPath.map((folder, index) => {
            const isCurrentFolder = index === folderPath.length - 1;

            return (
              <span className="explorer-breadcrumb__item" key={folder.id}>
                <FiChevronRight aria-hidden />
                {isCurrentFolder ? (
                  <strong>{folder.name}</strong>
                ) : (
                  <button type="button" onClick={() => onFolderOpen(folder.id)}>
                    {folder.name}
                  </button>
                )}
              </span>
            );
          })}
        </div>
        <div className="explorer-topbar__actions">
          <button className="explorer-upload-button" type="button" onClick={onUploadOpen}>
            <FiUpload aria-hidden /> Upload
          </button>
          <button className="explorer-icon-button" type="button" onClick={onLock} title="Lock explorer" aria-label="Lock explorer">
            <FiLogOut aria-hidden />
          </button>
        </div>
      </header>

      <FiltersSearch
        filter={filter}
        onFilterChange={onFilterChange}
        onSearchChange={onSearchChange}
        onSortChange={onSortChange}
        onViewChange={onViewChange}
        searchQuery={searchQuery}
        sort={sort}
        view={view}
      />

      <main className="explorer-main">
        <div className="explorer-section-title">
          {activeFolder ? <FiFolder aria-hidden /> : null}
          <h1>{activeFolder?.name ?? "All Media"}</h1>
          <span>{totalItems} items</span>
        </div>

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
