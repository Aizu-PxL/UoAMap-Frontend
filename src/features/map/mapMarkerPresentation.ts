import type { Event as CampusEvent, Place, RouteNode } from "../../data/types";
import { routeGraph } from "../routing/routeGraph";
import { getCenteredLineOffsetsEm } from "./mapOverlayGeometry";
import type { OverlayPoint } from "./mapOverlayGeometry";
import {
  campusBuildingLabelIds,
  LABEL_LINE_HEIGHT,
  LABEL_TARGET_PX,
} from "./mapLabels";
import type { MapLabel } from "./mapLabels";
import {
  getAggregatedEventMarkerColorKey,
  getEventMarkerColorKey,
} from "./eventMarkerColor";
import type { EventMarkerColorKey } from "./eventMarkerColor";

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

// アンカー先ラベルの上端からバッジ中心までの距離(バッジ半径11px + 余白)。
// ラベル行数ぶんの高さはgetLabelHalfHeightPxで加算するため、複数行でも文字と重ならない
const CAMPUS_EVENT_MARKER_LABEL_CLEARANCE_PX = 18;
// キャンパス直置きPlaceの個別バッジは地点名ラベルと同位置になりやすいため画面上20px持ち上げる
const CAMPUS_EVENT_MARKER_NODE_OFFSET_PX = 20;
const campusBuildingLabelIdByBuildingId: Record<CampusBuildingId, string> = {
  building_ResearchQuad: "text_ResearchQuad",
  building_StudentHall: "text_StudentHall",
  building_LecHall: "text_LecHall",
  building_UBIC: "text_UBIC",
  building_LICTiA: "text_LICTiA",
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
  colorKey: EventMarkerColorKey;
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
  | { kind: "route-node"; node: RouteNode }
  | { kind: "svg-element"; elementId: string };

function getLabelHalfHeightPx(label: MapLabel): number {
  const centeredOffsetsEm = getCenteredLineOffsetsEm(
    label.lineOffsetsEm,
    label.lines.length,
    LABEL_LINE_HEIGHT,
  );
  const lastOffsetEm = centeredOffsetsEm[centeredOffsetsEm.length - 1] ?? 0;
  return (lastOffsetEm + 0.5) * LABEL_TARGET_PX;
}

export function anchorCampusBuildingEventMarkers(
  markers: MapMarkerPlacement[],
  mapLabels: MapLabel[],
  userUnitsPerPixel: number,
  floorId: string,
): MapMarkerPlacement[] {
  const buildingLabelsById = new Map(
    mapLabels
      .filter((label) => campusBuildingLabelIds.has(label.id))
      .map((label) => [label.id, label]),
  );

  return markers.map((marker) => {
    if (marker.type !== "event") {
      return marker;
    }
    if (marker.buildingId) {
      const labelId = campusBuildingLabelIdByBuildingId[marker.buildingId];
      const label = buildingLabelsById.get(labelId);
      if (!label) {
        return marker;
      }
      const offsetPx =
        getLabelHalfHeightPx(label) + CAMPUS_EVENT_MARKER_LABEL_CLEARANCE_PX;
      return {
        ...marker,
        coordinates: {
          x: label.center.x,
          y: label.center.y - offsetPx * userUnitsPerPixel,
        },
      };
    }
    if (floorId === DEFAULT_FLOOR_ID) {
      return {
        ...marker,
        coordinates: {
          x: marker.coordinates.x,
          y:
            marker.coordinates.y -
            CAMPUS_EVENT_MARKER_NODE_OFFSET_PX * userUnitsPerPixel,
        },
      };
    }
    return marker;
  });
}

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

function resolveEventCoordinates(
  place: Place,
  resolveCoordinates: (target: MarkerCoordinateTarget) => OverlayPoint | null,
): OverlayPoint | null {
  const routeNode = routeGraph.nodes.find(
    (node) => node.placeId === place.id && node.floorId === place.floorId,
  );
  if (routeNode) {
    const nodeCoordinates = resolveCoordinates({
      kind: "route-node",
      node: routeNode,
    });
    if (nodeCoordinates) {
      return nodeCoordinates;
    }
  }

  return resolveCoordinates({ kind: "place", place });
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
    {
      firstEvent: CampusEvent;
      eventCount: number;
      colorKeys: Set<EventMarkerColorKey>;
    }
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
      colorKeys: new Set([
        ...(group?.colorKeys ?? []),
        getEventMarkerColorKey(event),
      ]),
    });
  }

  if (floorId === DEFAULT_FLOOR_ID) {
    const occupiedBuildingIds = new Set(
      pinPlaces
        .filter((place) => place.floorId === DEFAULT_FLOOR_ID)
        .map((place) => resolveCampusBuildingId(place, resolveFloorSheetId))
        .filter((buildingId): buildingId is CampusBuildingId => buildingId !== null),
    );
    const eventGroupsByBuildingId = new Map<
      CampusBuildingId,
      { eventCount: number; colorKeys: Set<EventMarkerColorKey> }
    >();
    for (const event of events) {
      const place = resolvePlace(event.placeId);
      const buildingId = place
        ? resolveCampusBuildingId(place, resolveFloorSheetId)
        : null;
      if (buildingId) {
        const group = eventGroupsByBuildingId.get(buildingId);
        eventGroupsByBuildingId.set(buildingId, {
          eventCount: (group?.eventCount ?? 0) + 1,
          colorKeys: new Set([
            ...(group?.colorKeys ?? []),
            getEventMarkerColorKey(event),
          ]),
        });
      }
    }

    for (const [buildingId, { eventCount, colorKeys }] of eventGroupsByBuildingId) {
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
        colorKey: getAggregatedEventMarkerColorKey(colorKeys),
      });
    }

    for (const [placeId, { firstEvent, eventCount, colorKeys }] of eventsByPlaceId) {
      const place = resolvePlace(placeId);
      if (
        !place ||
        place.floorId !== DEFAULT_FLOOR_ID ||
        resolveCampusBuildingId(place, resolveFloorSheetId) !== null ||
        pinPlaceIds.has(placeId)
      ) {
        continue;
      }
      const coordinates = resolveEventCoordinates(place, resolveCoordinates);
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
        colorKey: getAggregatedEventMarkerColorKey(colorKeys),
      });
    }
  } else {
    for (const [placeId, { firstEvent, colorKeys }] of eventsByPlaceId) {
      const place = resolvePlace(placeId);
      if (!place || place.floorId !== floorId || pinPlaceIds.has(placeId)) {
        continue;
      }
      const coordinates = resolveEventCoordinates(place, resolveCoordinates);
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
        colorKey: getAggregatedEventMarkerColorKey(colorKeys),
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
