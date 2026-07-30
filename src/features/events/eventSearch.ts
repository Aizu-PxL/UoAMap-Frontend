import type { Event as CampusEvent } from "../../data/types";

export type EventSearchCriteria = {
  query: string;
  tagIds: readonly string[];
};

export function filterEventsByCriteria(
  events: readonly CampusEvent[],
  criteria: EventSearchCriteria,
  resolvePlaceName: (placeId: string) => string | null,
): CampusEvent[] {
  const normalizedQuery = criteria.query.trim().toLowerCase();

  return events.filter((event) => {
    if (!criteria.tagIds.every((tagId) => event.tags.includes(tagId))) {
      return false;
    }
    if (normalizedQuery === "") {
      return true;
    }

    const placeName = resolvePlaceName(event.placeId) ?? "";
    const haystack = [event.id ?? "", event.title, event.description, placeName]
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalizedQuery);
  });
}
