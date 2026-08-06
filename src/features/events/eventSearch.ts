import type { Event as CampusEvent } from "../../data/types";

export type EventSearchCriteria = {
  query: string;
  tagIds: readonly string[];
};

function normalizeSearchText(value: string): string {
  return value
    .replace(/[０-９]/g, (character) =>
      String.fromCharCode(character.charCodeAt(0) - "０".charCodeAt(0) + "0".charCodeAt(0)),
    )
    .trim()
    .toLowerCase();
}

export function filterEventsByCriteria(
  events: readonly CampusEvent[],
  criteria: EventSearchCriteria,
  resolvePlaceName: (placeId: string) => string | null,
): CampusEvent[] {
  const normalizedQuery = normalizeSearchText(criteria.query);

  const tagFilteredEvents = events.filter((event) =>
    criteria.tagIds.every((tagId) => event.tags.includes(tagId)),
  );
  if (normalizedQuery === "") {
    return tagFilteredEvents;
  }

  const hasNumericQuery = /[0-9]/.test(normalizedQuery);
  const idMatchedEvents = hasNumericQuery
    ? tagFilteredEvents.filter((event) =>
        normalizeSearchText(event.id ?? "").includes(normalizedQuery),
      )
    : [];
  const searchEvents = idMatchedEvents.length > 0 ? idMatchedEvents : tagFilteredEvents;

  return searchEvents.filter((event) => {
    const placeName = resolvePlaceName(event.placeId) ?? "";
    const haystack = normalizeSearchText(
      [event.id ?? "", event.title, event.description, placeName].join(" "),
    );
    return haystack.includes(normalizedQuery);
  });
}
