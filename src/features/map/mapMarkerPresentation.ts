import type { Event as CampusEvent, Place, RouteNode } from "../../data/types";
import { routeGraph } from "../routing/routeGraph";
import {
  getAnchoredOverlayBounds,
  getCenteredLineOffsetsEm,
  overlayBoundsIntersect,
} from "./mapOverlayGeometry";
import type { OverlayBounds, OverlayPoint } from "./mapOverlayGeometry";
import { LABEL_LINE_HEIGHT, LABEL_TARGET_PX } from "./mapLabels";
import type { MapLabel, MapLabelPlacement } from "./mapLabels";
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
// 個別バッジをラベル矩形の直上へ退避させるときの、ラベル上端とバッジ下端の間隔
const EVENT_MARKER_LABEL_CLEARANCE_PX = 3;
// 退避量の上限。これを超えるとバッジが元の地点から離れすぎて指し先が分からなくなる
const EVENT_MARKER_MAX_ESCAPE_PX = 32;
// 退避先でさらに別のラベルへぶつかる場合の再試行回数
const EVENT_MARKER_ESCAPE_ATTEMPTS = 3;

export const EVENT_MARKER_SIZE = 24;
export const EVENT_MARKER_RADIUS = 11;
export const EVENT_MARKER_LOCAL_ANCHOR: OverlayPoint = { x: 12, y: 12 };

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

export function getEventCountWidth(eventCount: number): number {
  return Math.max(14, 8 + String(eventCount).length * 6);
}

/**
 * イベントバッジが実際にインクを載せる範囲(ローカル座標)。
 * 円は cx/cy=12・r=11 なので 1..23、件数ピルは x=16 から右へ張り出す。
 */
export function getEventMarkerLocalInkBounds(
  marker: EventMarkerPlacement,
): OverlayBounds {
  const circleLeft = EVENT_MARKER_SIZE / 2 - EVENT_MARKER_RADIUS;
  const circleRight = EVENT_MARKER_SIZE / 2 + EVENT_MARKER_RADIUS;

  return {
    left: circleLeft,
    top: circleLeft,
    right:
      marker.eventCount === undefined
        ? circleRight
        : Math.max(circleRight, 16 + getEventCountWidth(marker.eventCount)),
    bottom: circleRight,
  };
}

/** イベントバッジの描画範囲を、表示中SVGのルート座標へ解決する。 */
export function getEventMarkerInkBounds(
  marker: EventMarkerPlacement,
  userUnitsPerPixel: number,
  paddingPx = 0,
): OverlayBounds {
  return getAnchoredOverlayBounds(
    getEventMarkerLocalInkBounds(marker),
    marker.coordinates,
    userUnitsPerPixel,
    EVENT_MARKER_LOCAL_ANCHOR,
    paddingPx,
  );
}

// アンカー点から見たインク範囲の各辺までの距離(user単位)。
function getInkOffsets(marker: EventMarkerPlacement, userUnitsPerPixel: number) {
  const local = getEventMarkerLocalInkBounds(marker);
  return {
    left: (local.left - EVENT_MARKER_LOCAL_ANCHOR.x) * userUnitsPerPixel,
    top: (local.top - EVENT_MARKER_LOCAL_ANCHOR.y) * userUnitsPerPixel,
    right: (local.right - EVENT_MARKER_LOCAL_ANCHOR.x) * userUnitsPerPixel,
    bottom: (local.bottom - EVENT_MARKER_LOCAL_ANCHOR.y) * userUnitsPerPixel,
  };
}

function clampToRange(value: number, min: number, max: number, fallback: number): number {
  // 建物がバッジより小さい極端な引きでは範囲が反転するため、中央へ寄せる
  return min > max ? fallback : Math.min(Math.max(value, min), max);
}

/**
 * 集約バッジを建物名ラベルの直上へ置いたうえで、建物の外形bbox内へ押し戻す。
 * 直上オフセットは画面固定量なので、引き(userUnitsPerPixelが大)ではそのままだと外形を飛び出す。
 *
 * 押し戻しの制約は2段階。バッジ全体(インク範囲)を外形内に収めるのが基本だが、
 * それだと建物名の文字に乗ってしまう小さな建物では、**アンカー点が外形内にある**ことだけを
 * 保証して文字の直上へ戻す。建物名を消さずに、バッジが建物へ属して見える状態を優先する。
 */
function anchorAggregateEventMarker(
  marker: EventMarkerPlacement,
  buildingId: CampusBuildingId,
  labelById: Map<string, MapLabel>,
  labelBoundsById: Map<string, OverlayBounds>,
  buildingBounds: OverlayBounds | null,
  userUnitsPerPixel: number,
): EventMarkerPlacement {
  const labelId = campusBuildingLabelIdByBuildingId[buildingId];
  const label = labelById.get(labelId);
  const desired = label
    ? {
        x: label.center.x,
        y:
          label.center.y -
          (getLabelHalfHeightPx(label) + CAMPUS_EVENT_MARKER_LABEL_CLEARANCE_PX) *
            userUnitsPerPixel,
      }
    : marker.coordinates;

  if (!buildingBounds) {
    return { ...marker, coordinates: desired };
  }

  const ink = getInkOffsets(marker, userUnitsPerPixel);
  const centerX = (buildingBounds.left + buildingBounds.right) / 2;
  const x = clampToRange(
    desired.x,
    buildingBounds.left - ink.left,
    buildingBounds.right - ink.right,
    centerX - (ink.left + ink.right) / 2,
  );
  const softY = clampToRange(
    desired.y,
    buildingBounds.top - ink.top,
    buildingBounds.bottom - ink.bottom,
    (buildingBounds.top + buildingBounds.bottom) / 2 - (ink.top + ink.bottom) / 2,
  );
  const labelBounds = labelBoundsById.get(labelId);
  const hitsLabel = (candidateY: number) =>
    labelBounds !== undefined &&
    overlayBoundsIntersect(
      getAnchoredOverlayBounds(
        getEventMarkerLocalInkBounds(marker),
        { x, y: candidateY },
        userUnitsPerPixel,
        EVENT_MARKER_LOCAL_ANCHOR,
      ),
      labelBounds,
    );

  let y = softY;
  if (labelBounds && hitsLabel(softY)) {
    // 建物名が建物の上端寄りだと直上に逃げ場がない。その場合は文字の直下へ回す。
    const clearance = EVENT_MARKER_LABEL_CLEARANCE_PX * userUnitsPerPixel;
    const above = labelBounds.top - clearance - ink.bottom;
    const below = labelBounds.bottom + clearance - ink.top;
    const overhang = (candidate: number) =>
      Math.max(0, buildingBounds.top - (candidate + ink.top)) +
      Math.max(0, candidate + ink.bottom - buildingBounds.bottom);
    // アンカーが外形内に残る候補のうち、外形からのはみ出しが最小のものを選ぶ
    const clearCandidates = [above, below].filter(
      (candidate) =>
        candidate >= buildingBounds.top &&
        candidate <= buildingBounds.bottom &&
        !hitsLabel(candidate),
    );
    y =
      clearCandidates.length > 0
        ? clearCandidates.reduce((best, candidate) =>
            overhang(candidate) < overhang(best) ? candidate : best,
          )
        : Math.max(above, buildingBounds.top);
  }

  return { ...marker, coordinates: { x, y } };
}

/**
 * 個別バッジは対応ルートノード＝地点名ラベルとほぼ同一点に置かれているため、
 * ラベル矩形と重なる場合だけその直上へ退避させる。重ならない地点は動かさない。
 */
function escapeEventMarkerFromLabels(
  marker: EventMarkerPlacement,
  labelBounds: OverlayBounds[],
  userUnitsPerPixel: number,
): EventMarkerPlacement {
  const ink = getInkOffsets(marker, userUnitsPerPixel);
  const clearance = EVENT_MARKER_LABEL_CLEARANCE_PX * userUnitsPerPixel;
  const lowestY = marker.coordinates.y - EVENT_MARKER_MAX_ESCAPE_PX * userUnitsPerPixel;
  let y = marker.coordinates.y;

  for (let attempt = 0; attempt < EVENT_MARKER_ESCAPE_ATTEMPTS; attempt += 1) {
    const current = { ...marker, coordinates: { x: marker.coordinates.x, y } };
    const blocking = labelBounds.filter((bounds) =>
      overlayBoundsIntersect(getEventMarkerInkBounds(current, userUnitsPerPixel), bounds),
    );
    if (blocking.length === 0) {
      break;
    }

    const unionTop = Math.min(...blocking.map((bounds) => bounds.top));
    const escapedY = unionTop - clearance - ink.bottom;
    if (escapedY >= y) {
      // これ以上持ち上げても解消しない(ラベルがバッジより下にある)ため打ち切る
      break;
    }

    y = Math.max(escapedY, lowestY);
    if (y === lowestY) {
      break;
    }
  }

  return y === marker.coordinates.y ? marker : { ...marker, coordinates: { x: marker.coordinates.x, y } };
}

export interface LayoutEventMarkersOptions {
  markers: MapMarkerPlacement[];
  labelPlacements: MapLabelPlacement[];
  mapLabels: MapLabel[];
  userUnitsPerPixel: number;
  resolveElementBounds: (elementId: string) => OverlayBounds | null;
}

/** 確定済みラベルを避けるようにイベントバッジの最終座標を決める。 */
export function layoutEventMarkers({
  markers,
  labelPlacements,
  mapLabels,
  userUnitsPerPixel,
  resolveElementBounds,
}: LayoutEventMarkersOptions): MapMarkerPlacement[] {
  const labelById = new Map(mapLabels.map((label) => [label.id, label]));
  const labelBoundsById = new Map(
    labelPlacements.map((placement) => [placement.label.id, placement.bounds]),
  );
  const labelBounds = labelPlacements.map((placement) => placement.bounds);

  return markers.map((marker) => {
    if (marker.type !== "event") {
      return marker;
    }
    if (marker.buildingId) {
      return anchorAggregateEventMarker(
        marker,
        marker.buildingId,
        labelById,
        labelBoundsById,
        resolveElementBounds(marker.buildingId),
        userUnitsPerPixel,
      );
    }
    return escapeEventMarkerFromLabels(marker, labelBounds, userUnitsPerPixel);
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
