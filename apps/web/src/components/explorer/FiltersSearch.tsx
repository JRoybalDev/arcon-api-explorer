import { FiGrid, FiList, FiSearch, FiShuffle } from "react-icons/fi";
import type { ExplorerFilter, ExplorerSort, ExplorerView } from "./types";

type FiltersSearchProps = {
  filter: ExplorerFilter;
  searchQuery: string;
  sort: ExplorerSort;
  view: ExplorerView;
  onFilterChange: (filter: ExplorerFilter) => void;
  onRandomFile: () => void;
  onSearchChange: (query: string) => void;
  onShuffleFiles: () => void;
  onSortChange: (sort: ExplorerSort) => void;
  onViewChange: (view: ExplorerView) => void;
};

const filters: Array<{ label: string; value: ExplorerFilter }> = [
  { label: "All", value: "all" },
  { label: "Images", value: "image" },
  { label: "Videos", value: "video" }
];

export function FiltersSearch({
  filter,
  searchQuery,
  sort,
  view,
  onFilterChange,
  onRandomFile,
  onSearchChange,
  onShuffleFiles,
  onSortChange,
  onViewChange
}: FiltersSearchProps) {
  return (
    <div className="explorer-filters" aria-label="Media filters">
      <div className="explorer-filter-tabs" role="tablist" aria-label="Media type">
        {filters.map((option) => (
          <button aria-selected={filter === option.value} key={option.value} role="tab" type="button" onClick={() => onFilterChange(option.value)}>
            {option.label}
          </button>
        ))}
      </div>

      <select aria-label="Sort media" value={sort} onChange={(event) => onSortChange(event.target.value as ExplorerSort)}>
        <option value="newest">Newest first</option>
        <option value="oldest">Oldest first</option>
        <option value="name">Name A-Z</option>
      </select>

      <label className="explorer-search">
        <FiSearch aria-hidden />
        <span className="sr-only">Search files</span>
        <input placeholder="Search files..." value={searchQuery} onChange={(event) => onSearchChange(event.target.value)} />
      </label>

      <div className="explorer-view-toggle" aria-label="View mode">
        <button aria-pressed={view === "small"} type="button" onClick={() => onViewChange("small")} title="Small grid">
          <FiGrid aria-hidden />
        </button>
        <button aria-pressed={view === "medium"} type="button" onClick={() => onViewChange("medium")} title="Medium grid">
          <FiGrid aria-hidden />
        </button>
        <button aria-pressed={view === "large"} type="button" onClick={() => onViewChange("large")} title="Large grid">
          <FiGrid aria-hidden />
        </button>
        <button aria-pressed={view === "list"} type="button" onClick={() => onViewChange("list")} title="List view">
          <FiList aria-hidden />
        </button>
      </div>

      <div className="explorer-action-toggle" aria-label="File actions">
        <button type="button" onClick={onShuffleFiles} title="Shuffle files">
          <FiShuffle aria-hidden />
        </button>
        <button type="button" onClick={onRandomFile}>
          Random
        </button>
      </div>
    </div>
  );
}
