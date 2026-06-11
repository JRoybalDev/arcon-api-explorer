import { FiColumns, FiList, FiMaximize, FiSearch, FiSquare } from "react-icons/fi";
import type { ExplorerView } from "./types";

type FiltersSearchProps = {
  searchQuery: string;
  view: ExplorerView;
  onSearchChange: (query: string) => void;
  onViewChange: (view: ExplorerView) => void;
};

export function FiltersSearch({
  searchQuery,
  view,
  onSearchChange,
  onViewChange
}: FiltersSearchProps) {
  return (
    <div className="explorer-filters" aria-label="Media filters">
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
