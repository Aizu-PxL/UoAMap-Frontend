import type { Event as CampusEvent, Place } from "../../data/types";
import type { OverlayPoint } from "./mapOverlayGeometry";

const DEFAULT_FLOOR_ID = "campus";

const campusBuildings = {
  building_ResearchQuad: { floorId: "rq-1f", label: "研究棟" },
  building_StudentHall: { floorId: "sh-1f", label: "学生ホール" },
  building_LecHall: { floorId: "lh-1f", label: "講義棟" },
  building_UBIC: { floorId: "ubic-1f", label: "UBIC" },
  building_LICTiA: { floorId: "lictia-1f", label: "LICTiA" },
} as const;

export type CampusBuildingId = keyof typeof campusBuildings;

const campusBuildingIdBySheetId: Record<string, CampusBuildingId> = {
  rq1f: "building_ResearchQuad",
  rq2f: "building_ResearchQuad",
  rq3f: "building_ResearchQuad",
  sh1f: "building_StudentHall",
  sh2f: "building_StudentHall",
  lh1f: "building_LecHall",
  lh2f: "building_LecHall",
  ubic: "building_UBIC",
  lictia: "building_LICTiA",
};

export type EventMarkerAction =
  | { kind: "floor"; floorId: string }
  | { kind: "event"; eventKey: string };

export type EventMarkerPlacement = {
  type: "event";
  coordinates: OverlayPoint;
  markerLabel: string;
  action: EventMarkerAction;
  placeId?: string;
  eventKey?: string;
  eventId?: string;
  buildingId?: CampusBuildingId;
  eventCount?: number;
};

export type PinMarkerPlacement = {
  type: "pin";
  coordinates: OverlayPoint;
  markerKind: "current" | "destination" | "focus";
  placeId: string;
};

export type MapMarkerPlacement = EventMarkerPlacement | PinMarkerPlacement;

export type MarkerCoordinateTarget =
  | { kind: "place"; place: Place }
  | { kind: "svg-element"; elementId: string };

type CreateMapMarkerPresentationOptions = {
  currentPlace: Place | null;
  destinationPlace: Place | null;
  events: readonly CampusEvent[];
  floorId: string;
  focusPlace: Place | null;
  resolveCoordinates: (target: MarkerCoordinateTarget) => OverlayPoint | null;
  resolveFloorSheetId: (floorId: string) => string | null;
  resolvePlace: (placeId: string) => Place | null;
};

function resolveCampusBuildingId(
  place: Place,
  resolveFloorSheetId: (floorId: string) => string | null,
): CampusBuildingId | null {
  const sheetId = resolveFloorSheetId(place.floorId);
  if (!sheetId) {
    return null;
  }
  const buildingId = campusBuildingIdBySheetId[sheetId];
  if (buildingId) {
    return buildingId;
  }
  if (
    sheetId === DEFAULT_FLOOR_ID &&
    place.mapping === "svg" &&
    place.svgElementId in campusBuildings
  ) {
    return place.svgElementId as CampusBuildingId;
  }
  return null;
}

export function createMapMarkerPresentation({
  currentPlace,
  destinationPlace,
  events,
  floorId,
  focusPlace,
  resolveCoordinates,
  resolveFloorSheetId,
  resolvePlace,
}: CreateMapMarkerPresentationOptions): MapMarkerPlacement[] {
  const placements: MapMarkerPlacement[] = [];
  const eventsByPlaceId = new Map<
    string,
    { firstEvent: CampusEvent; eventCount: number }
  >();
  const pinPlaces = [currentPlace, destinationPlace, focusPlace].filter(
    (place): place is Place => place !== null,
  );
  const pinPlaceIds = new Set(pinPlaces.map((place) => place.id));

  for (const event of events) {
    const group = eventsByPlaceId.get(event.placeId);
    eventsByPlaceId.set(event.placeId, {
      firstEvent: group?.firstEvent ?? event,
      eventCount: (group?.eventCount ?? 0) + 1,
    });
  }

  if (floorId === DEFAULT_FLOOR_ID) {
    const occupiedBuildingIds = new Set(
      pinPlaces
        .filter((place) => place.floorId === DEFAULT_FLOOR_ID)
        .map((place) => resolveCampusBuildingId(place, resolveFloorSheetId))
        .filter((buildingId): buildingId is CampusBuildingId => buildingId !== null),
    );
    const eventCountByBuildingId = new Map<CampusBuildingId, number>();
    for (const event of events) {
      const place = resolvePlace(event.placeId);
      const buildingId = place
        ? resolveCampusBuildingId(place, resolveFloorSheetId)
        : null;
      if (buildingId) {
        eventCountByBuildingId.set(
          buildingId,
          (eventCountByBuildingId.get(buildingId) ?? 0) + 1,
        );
      }
    }

    for (const [buildingId, eventCount] of eventCountByBuildingId) {
      if (occupiedBuildingIds.has(buildingId)) {
        continue;
      }
      const coordinates = resolveCoordinates({
        kind: "svg-element",
        elementId: buildingId,
      });
      if (!coordinates) {
        continue;
      }
      const building = campusBuildings[buildingId];
      placements.push({
        type: "event",
        coordinates,
        markerLabel: `${building.label}、イベント${eventCount}件。建物を表示`,
        action: { kind: "floor", floorId: building.floorId },
        buildingId,
        eventCount,
      });
    }

    for (const [placeId, { firstEvent, eventCount }] of eventsByPlaceId) {
      const place = resolvePlace(placeId);
      if (
        !place ||
        place.floorId !== DEFAULT_FLOOR_ID ||
        resolveCampusBuildingId(place, resolveFloorSheetId) !== null ||
        pinPlaceIds.has(placeId)
      ) {
        continue;
      }
      const coordinates = resolveCoordinates({ kind: "place", place });
      if (!coordinates) {
        continue;
      }
      placements.push({
        type: "event",
        coordinates,
        markerLabel: `${place.name}のイベント${eventCount}件を表示: ${firstEvent.title}`,
        action: { kind: "event", eventKey: firstEvent.key },
        placeId: place.id,
        eventKey: firstEvent.key,
        eventId: firstEvent.id,
        eventCount,
      });
    }
  } else {
    for (const [placeId, { firstEvent }] of eventsByPlaceId) {
      const place = resolvePlace(placeId);
      if (!place || place.floorId !== floorId || pinPlaceIds.has(placeId)) {
        continue;
      }
      const coordinates = resolveCoordinates({ kind: "place", place });
      if (!coordinates) {
        continue;
      }
      placements.push({
        type: "event",
        coordinates,
        markerLabel: `${place.name}のイベントを表示: ${firstEvent.title}`,
        action: { kind: "event", eventKey: firstEvent.key },
        placeId: place.id,
        eventKey: firstEvent.key,
        eventId: firstEvent.id,
      });
    }
  }

  const pins = [
    { place: currentPlace, markerKind: "current" },
    { place: destinationPlace, markerKind: "destination" },
    { place: focusPlace, markerKind: "focus" },
  ] as const;
  for (const pin of pins) {
    if (!pin.place || pin.place.floorId !== floorId) {
      continue;
    }
    const coordinates = resolveCoordinates({ kind: "place", place: pin.place });
    if (!coordinates) {
      continue;
    }
    placements.push({
      type: "pin",
      coordinates,
      markerKind: pin.markerKind,
      placeId: pin.place.id,
    });
  }

  return placements;
}
