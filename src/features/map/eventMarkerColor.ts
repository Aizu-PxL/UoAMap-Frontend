import type { Event as CampusEvent } from "../../data/types";

export type EventMarkerColorKey =
  | "explanation"
  | "guardian"
  | "open-lab"
  | "tour"
  | "trial-class"
  | "consultation"
  | "study"
  | "default";

const colorKeyByIdPrefix: Record<string, EventMarkerColorKey> = {
  A: "explanation",
  L: "explanation",
  E: "explanation",
  U: "guardian",
  P: "open-lab",
  T: "tour",
  M: "trial-class",
  G: "consultation",
  R: "study",
};

export function getEventMarkerColorKey(
  event: Pick<CampusEvent, "id">,
): EventMarkerColorKey {
  return event.id ? (colorKeyByIdPrefix[event.id[0]] ?? "default") : "default";
}

export function getAggregatedEventMarkerColorKey(
  colorKeys: Iterable<EventMarkerColorKey>,
): EventMarkerColorKey {
  const uniqueColorKeys = new Set(colorKeys);
  return uniqueColorKeys.size === 1
    ? (uniqueColorKeys.values().next().value ?? "default")
    : "default";
}
