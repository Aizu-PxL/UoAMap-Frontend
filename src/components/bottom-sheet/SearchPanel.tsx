import { SearchResultCard, type SearchResult } from "./SearchResultCard";

const categories = ["Label", "Label", "Label", "Label", "Label"];

const events: SearchResult[] = Array.from({ length: 8 }, (_, index) => ({
  id: index + 1,
  title: "ICチップのための自動設計技術（小平 行秀）",
  time: "10:00〜15:00（休憩 12:00〜13:00）",
  place: "@研究棟1F 104F",
  tag: "研究室公開",
}));

export function SearchPanel() {
  return (
    <div className="search-panel">
      <label className="search-field">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="m16 16 4 4" />
        </svg>
        <input placeholder="Search" type="search" />
      </label>

      <div className="category-row" aria-label="Search filters">
        {categories.map((category, index) => (
          <button className={index === 0 ? "category-chip is-active" : "category-chip"} key={`${category}-${index}`} type="button">
            {index === 0 && <span aria-hidden="true">✓</span>}
            {category}
          </button>
        ))}
      </div>

      <div className="event-list">
        {events.map((event) => (
          <SearchResultCard key={event.id} result={event} />
        ))}
      </div>
    </div>
  );
}
