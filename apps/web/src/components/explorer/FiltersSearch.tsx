import { FiCheckSquare, FiColumns, FiList, FiMaximize, FiSearch, FiSquare } from "react-icons/fi";
import type { ExplorerFilter, ExplorerSort, ExplorerView } from "./types";

type FiltersSearchProps = {
  filter: ExplorerFilter;
  searchQuery: string;
  sort: ExplorerSort;
  view: ExplorerView;
  onFilterChange: (filter: ExplorerFilter) => void;
  onSearchChange: (query: string) => void;
  onSelectItems: () => void;
  onSortChange: (sort: ExplorerSort) => void;
  onViewChange: (view: ExplorerView) => void;
};

const filterOptions: Array<{ label: string; value: ExplorerFilter }> = [
  { label: "All", value: "all" },
  { label: "Images", value: "image" },
  { label: "Videos", value: "video" },
  { label: "Mixed", value: "mixed" }
];

const sortOptions: Array<{ label: string; value: ExplorerSort }> = [
  { label: "Newest first", value: "newest" },
  { label: "Oldest first", value: "oldest" },
  { label: "Name A-Z", value: "name" }
];

export function FiltersSearch({
  filter,
  searchQuery,
  sort,
  view,
  onFilterChange,
  onSearchChange,
  onSelectItems,
  onSortChange,
  onViewChange
}: FiltersSearchProps) {
  return (
    <div className="explorer-filters" aria-label="Media filters">
      <label className="explorer-search">
        <FiSearch aria-hidden />
        <span className="sr-only">Search files</span>
        <input placeholder="Search files..." value={searchQuery} onChange={(event) => onSearchChange(event.target.value)} />
      </label>

      <div className="explorer-toolbar-controls">
        <div className="explorer-filter-tabs" aria-label="File filter">
          {filterOptions.map((option) => (
            <button key={option.value} aria-pressed={filter === option.value} type="button" onClick={() => onFilterChange(option.value)}>
              {option.label}
            </button>
          ))}
        </div>

        <label className="explorer-sort-select">
          <span className="sr-only">Sort by</span>
          <select value={sort} onChange={(event) => onSortChange(event.target.value as ExplorerSort)}>
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <button className="explorer-select-items-button" type="button" onClick={onSelectItems}>
          <FiCheckSquare aria-hidden />
          Select items
        </button>
      </div>

      <div className="explorer-view-toggle" aria-label="View mode">
        <button aria-pressed={view === "small"} type="button" onClick={() => onViewChange("small")} title="Square cards">
          <FiSquare aria-hidden />
        </button>
        <button aria-pressed={view === "medium"} type="button" onClick={() => onViewChange("medium")} title="Rectangular cards">
          <FiColumns aria-hidden />
        </button>
        <button className="explorer-view-toggle__large" aria-pressed={view === "large"} type="button" onClick={() => onViewChange("large")} title="Large rectangular cards">
          <FiMaximize aria-hidden />
        </button>
        <button className="explorer-view-toggle__list" aria-pressed={view === "list"} type="button" onClick={() => onViewChange("list")} title="List view">
          <FiList aria-hidden />
        </button>
      </div>
    </div>
  );
}
