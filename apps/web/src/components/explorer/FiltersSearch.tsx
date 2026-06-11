import { FiColumns, FiList, FiMaximize, FiSearch, FiSquare } from "react-icons/fi";
import type { ExplorerFilter, ExplorerSort, ExplorerView } from "./types";

type FiltersSearchProps = {
  filter: ExplorerFilter;
  searchQuery: string;
  sort: ExplorerSort;
  view: ExplorerView;
  onFilterChange: (filter: ExplorerFilter) => void;
  onSearchChange: (query: string) => void;
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
  onSearchChange,
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
        <button aria-pressed={view === "small"} type="button" onClick={() => onViewChange("small")} title="Square cards">
          <FiSquare aria-hidden />
        </button>
        <button aria-pressed={view === "medium"} type="button" onClick={() => onViewChange("medium")} title="Rectangular cards">
          <FiColumns aria-hidden />
        </button>
        <button aria-pressed={view === "large"} type="button" onClick={() => onViewChange("large")} title="Large rectangular cards">
          <FiMaximize aria-hidden />
        </button>
        <button aria-pressed={view === "list"} type="button" onClick={() => onViewChange("list")} title="List view">
          <FiList aria-hidden />
        </button>
      </div>
    </div>
  );
}
