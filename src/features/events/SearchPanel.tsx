import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { useCampusData } from "../../data/DataProvider";
import { getPlace } from "../../data/places";
import { EventCard } from "./EventCard";
import { filterEventsByCriteria } from "./eventSearch";

export function SearchPanel() {
  const { events, tags, loading, error } = useCampusData();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [activeTagId, setActiveTagId] = useState<string | null>(null);
  const [highlightedCardElement, setHighlightedCardElement] =
    useState<HTMLAnchorElement | null>(null);
  const previousHighlightRef = useRef<string | null>(null);
  const lastScrolledElementRef = useRef<HTMLAnchorElement | null>(null);
  const highlightedEventKey = searchParams.get("highlight");
  const highlightedCardRef = useCallback((element: HTMLAnchorElement | null) => {
    setHighlightedCardElement(element);
  }, []);

  const filteredEvents = useMemo(
    () =>
      filterEventsByCriteria(
        events,
        { query, tagIds: activeTagId ? [activeTagId] : [] },
        (placeId) => getPlace(placeId)?.name ?? null,
      ),
    [events, query, activeTagId],
  );

  const tagLabelById = useMemo(
    () => new Map(tags.map((tag) => [tag.id, tag.label])),
    [tags],
  );

  useEffect(() => {
    if (highlightedEventKey === previousHighlightRef.current) {
      return;
    }

    previousHighlightRef.current = highlightedEventKey;
    lastScrolledElementRef.current = null;
    if (highlightedEventKey) {
      // A marker selection starts from the unfiltered list so its card is visible.
      setQuery("");
      setActiveTagId(null);
    }
  }, [highlightedEventKey]);

  // 対象カードのDOM要素が(再)出現するたびにスクロールする。
  // ロード完了時のリスト再マウントでsmoothスクロールが中断されても、
  // 新しい要素インスタンスに対して再実行される。
  useEffect(() => {
    if (!highlightedEventKey) {
      lastScrolledElementRef.current = null;
      return;
    }
    if (
      loading ||
      !highlightedCardElement ||
      !highlightedCardElement.isConnected ||
      highlightedCardElement.dataset.eventKey !== highlightedEventKey ||
      lastScrolledElementRef.current === highlightedCardElement
    ) {
      return;
    }

    // 画面遷移直後のジャンプなので即時スクロール(smoothはバックグラウンドタブ等で
    // アニメーションが進まず止まることがある)
    const scrollToCard = () =>
      highlightedCardElement.scrollIntoView({
        behavior: "auto",
        block: "center",
      });
    scrollToCard();
    // ボトムシートの高さトランジション(180ms)中に走るとズレるので、完了後に補正
    const correctionTimer = window.setTimeout(scrollToCard, 250);
    lastScrolledElementRef.current = highlightedCardElement;
    return () => window.clearTimeout(correctionTimer);
  }, [highlightedCardElement, highlightedEventKey, loading]);

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
              key={event.key}
              event={event}
              tagLabel={event.tags.map((id) => tagLabelById.get(id) ?? id).join(" / ")}
              highlighted={event.key === highlightedEventKey}
              cardRef={event.key === highlightedEventKey ? highlightedCardRef : undefined}
            />
          ))
        )}
      </div>
    </div>
  );
}
