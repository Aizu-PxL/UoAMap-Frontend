import { useMemo, useState } from "react";
import { useCampusData } from "../../data/DataProvider";
import { getPlace } from "../../data/places";
import type { Event as CampusEvent } from "../../data/types";
import { EventCard } from "./EventCard";

export function SearchPanel() {
  const { events, tags, loading, error } = useCampusData();
  const [query, setQuery] = useState("");
  const [activeTagId, setActiveTagId] = useState<string | null>(null);

  const filteredEvents = useMemo(
    () => filterEvents(events, query, activeTagId),
    [events, query, activeTagId],
  );

  const tagLabelById = useMemo(
    () => new Map(tags.map((tag) => [tag.id, tag.label])),
    [tags],
  );

  return (
    <div className="search-panel">
      <label className="search-field">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="m16 16 4 4" />
        </svg>
        <input
          placeholder="イベントを検索"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>

      <div className="category-row" aria-label="カテゴリで絞り込み">
        {tags.map((tag) => {
          const isActive = tag.id === activeTagId;
          return (
            <button
              className={isActive ? "category-chip is-active" : "category-chip"}
              key={tag.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => setActiveTagId(isActive ? null : tag.id)}
            >
              {isActive && <span aria-hidden="true">✓</span>}
              {tag.label}
            </button>
          );
        })}
      </div>

      <div className="event-list">
        {loading ? (
          <p className="event-list__empty">読み込み中…</p>
        ) : error ? (
          <p className="event-list__empty" role="alert">
            {error}
          </p>
        ) : filteredEvents.length === 0 ? (
          <p className="event-list__empty">該当するイベントがありません</p>
        ) : (
          filteredEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              tagLabel={event.tags.map((id) => tagLabelById.get(id) ?? id).join(" / ")}
            />
          ))
        )}
      </div>
    </div>
  );
}

function filterEvents(events: CampusEvent[], query: string, tagId: string | null): CampusEvent[] {
  const normalizedQuery = query.trim().toLowerCase();
  return events.filter((event) => {
    if (tagId && !event.tags.includes(tagId)) {
      return false;
    }
    if (normalizedQuery === "") {
      return true;
    }
    const placeName = getPlace(event.placeId)?.name ?? "";
    const haystack = `${event.id} ${event.title} ${event.description} ${placeName}`.toLowerCase();
    return haystack.includes(normalizedQuery);
  });
}
