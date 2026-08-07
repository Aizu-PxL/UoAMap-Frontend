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

type CampusProjectionFrame = {
  buildingId: CampusBuildingId;
  x: number;
  y: number;
  width: number;
  height: number;
};

// 各屋内SVGルートのviewBox。RQ2FはviewBoxがないためwidth/heightを使う。
// 屋内座標をこの範囲内の比率へ変換し、キャンパス建物bboxへ概略投影する。
const campusProjectionFrameBySheetId: Record<string, CampusProjectionFrame> = {
  rq1f: {
    buildingId: "building_ResearchQuad",
    x: 0,
    y: 0,
    width: 454.01063,
    height: 649.68758,
  },
  rq2f: {
    buildingId: "building_ResearchQuad",
    x: 0,
    y: 0,
    width: 507.13501,
    height: 693,
  },
  rq3f: {
    buildingId: "building_ResearchQuad",
    x: 0,
    y: 0,
    width: 486.13242,
    height: 693,
  },
  sh1f: {
    buildingId: "building_StudentHall",
    x: 0,
    y: 0,
    width: 136.95795,
    height: 127.79022,
  },
  sh2f: {
    buildingId: "building_StudentHall",
    x: 0,
    y: 0,
    width: 133.77486,
    height: 124.54876,
  },
  lh1f: {
    buildingId: "building_LecHall",
    x: 0.468751,
    y: 394.109032,
    width: 467.343628,
    height: 184.172729,
  },
  lh2f: {
    buildingId: "building_LecHall",
    x: 0.468911,
    y: 0.937538,
    width: 467.343597,
    height: 284.487366,
  },
  ubic: {
    buildingId: "building_UBIC",
    x: 0,
    y: 0,
    width: 178.37125,
    height: 76.03061,
  },
  lictia: {
    buildingId: "building_LICTiA",
    x: 0,
    y: 0,
    width: 123.74366,
    height: 92.549674,
  },
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
  replacesEventMarker?:
    | { kind: "place"; placeId: string }
    | { kind: "building"; buildingId: CampusBuildingId };
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

/** 矩形内に中心があるラベルのうち、矩形の中心に最も近いものを返す。 */
export function findLabelInsideBounds(
  labels: MapLabel[],
  bounds: OverlayBounds,
): MapLabel | null {
  const centerX = (bounds.left + bounds.right) / 2;
  const centerY = (bounds.top + bounds.bottom) / 2;
  const distance = (label: MapLabel) =>
    (label.center.x - centerX) ** 2 + (label.center.y - centerY) ** 2;

  return labels
    .filter(
      (label) =>
        label.center.x >= bounds.left &&
        label.center.x <= bounds.right &&
        label.center.y >= bounds.top &&
        label.center.y <= bounds.bottom,
    )
    .reduce<MapLabel | null>(
      (nearest, label) =>
        nearest === null || distance(label) < distance(nearest) ? label : nearest,
      null,
    );
}

/**
 * バッジをアンカーラベル(俯瞰なら建物名、フロアなら部屋名)の直上へ置いたうえで、
 * その外形bbox(建物 or 部屋)の中へ押し戻す。
 * 直上オフセットは画面固定量なので、引き(userUnitsPerPixelが大)ではそのままだと外形を飛び出す。
 *
 * 押し戻しの制約は2段階。バッジ全体(インク範囲)を外形内に収めるのが基本だが、
 * それだと文字に乗ってしまう小さな建物・部屋では、**アンカー点が外形内にある**ことだけを
 * 保証し、直上・直下のうち外形からのはみ出しが少ない側へ置く。
 * 文字を消さずに、バッジがその建物・部屋へ属して見える状態を優先する。
 */
function anchorEventMarkerWithinBounds(
  marker: EventMarkerPlacement,
  anchorLabel: MapLabel,
  anchorLabelBounds: OverlayBounds | undefined,
  containerBounds: OverlayBounds | null,
  userUnitsPerPixel: number,
  /** 左右位置の基準。俯瞰の集約バッジは建物名、フロアはルートノードのx */
  desiredX: number,
): EventMarkerPlacement {
  const desired = {
    x: desiredX,
    y:
      anchorLabel.center.y -
      (getLabelHalfHeightPx(anchorLabel) + CAMPUS_EVENT_MARKER_LABEL_CLEARANCE_PX) *
        userUnitsPerPixel,
  };
  if (!containerBounds) {
    return { ...marker, coordinates: desired };
  }

  const ink = getInkOffsets(marker, userUnitsPerPixel);
  const x = clampToRange(
    desired.x,
    containerBounds.left - ink.left,
    containerBounds.right - ink.right,
    (containerBounds.left + containerBounds.right) / 2 - (ink.left + ink.right) / 2,
  );
  const softY = clampToRange(
    desired.y,
    containerBounds.top - ink.top,
    containerBounds.bottom - ink.bottom,
    (containerBounds.top + containerBounds.bottom) / 2 - (ink.top + ink.bottom) / 2,
  );
  const hitsLabel = (candidateY: number) =>
    anchorLabelBounds !== undefined &&
    overlayBoundsIntersect(
      getAnchoredOverlayBounds(
        getEventMarkerLocalInkBounds(marker),
        { x, y: candidateY },
        userUnitsPerPixel,
        EVENT_MARKER_LOCAL_ANCHOR,
      ),
      anchorLabelBounds,
    );

  let y = softY;
  if (anchorLabelBounds && hitsLabel(softY)) {
    // 押し戻した結果アンカー先の文字に乗るなら、文字の直上まで戻す。
    // 外形の上端より上へは出さない(アンカー点は必ず外形内に残す)。
    const clearance = EVENT_MARKER_LABEL_CLEARANCE_PX * userUnitsPerPixel;
    y = Math.max(
      anchorLabelBounds.top - clearance - ink.bottom,
      containerBounds.top,
    );
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
  /** 建物SVG要素の外形bbox(俯瞰の集約バッジ用) */
  resolveElementBounds: (elementId: string) => OverlayBounds | null;
  /** Placeに対応するSVG要素(部屋)の外形bbox。座標指定Placeなどはnull */
  resolvePlaceBounds: (placeId: string) => OverlayBounds | null;
}

export interface EventMarkerLayout {
  markers: MapMarkerPlacement[];
  /** バッジのアンカーに使ったラベルID。バッジによる衝突カリングから保護する */
  anchoredLabelIds: Set<string>;
  /** 最終出力に残るバッジだけのアンカー保護を選べるよう、対象別にも保持する */
  anchoredLabelIdsByMarkerKey: Map<string, string>;
}

/** 確定済みラベルと外形bboxをもとにイベントバッジの最終座標を決める。 */
export function layoutEventMarkers({
  markers,
  labelPlacements,
  mapLabels,
  userUnitsPerPixel,
  resolveElementBounds,
  resolvePlaceBounds,
}: LayoutEventMarkersOptions): EventMarkerLayout {
  const labelById = new Map(mapLabels.map((label) => [label.id, label]));
  const labelBoundsById = new Map(
    labelPlacements.map((placement) => [placement.label.id, placement.bounds]),
  );
  const labelBounds = labelPlacements.map((placement) => placement.bounds);
  const anchoredLabelIds = new Set<string>();
  const anchoredLabelIdsByMarkerKey = new Map<string, string>();

  // 建物(俯瞰)・部屋(フロア)のどちらも「アンカーラベルの直上 → 外形内へ押し戻し」で揃える。
  const anchorWithin = (
    marker: EventMarkerPlacement,
    anchorLabel: MapLabel | null,
    containerBounds: OverlayBounds | null,
    desiredX: number,
  ): MapMarkerPlacement | null => {
    if (!anchorLabel) {
      return null;
    }
    anchoredLabelIds.add(anchorLabel.id);
    const markerKey = marker.buildingId
      ? `building:${marker.buildingId}`
      : marker.placeId
        ? `place:${marker.placeId}`
        : null;
    if (markerKey) {
      anchoredLabelIdsByMarkerKey.set(markerKey, anchorLabel.id);
    }
    return anchorEventMarkerWithinBounds(
      marker,
      anchorLabel,
      labelBoundsById.get(anchorLabel.id),
      containerBounds,
      userUnitsPerPixel,
      desiredX,
    );
  };

  const laidOutMarkers = markers.map((marker) => {
    if (marker.type !== "event") {
      return marker;
    }

    if (marker.buildingId) {
      const buildingLabel =
        labelById.get(campusBuildingLabelIdByBuildingId[marker.buildingId]) ?? null;
      return (
        anchorWithin(
          marker,
          buildingLabel,
          resolveElementBounds(marker.buildingId),
          buildingLabel?.center.x ?? marker.coordinates.x,
        ) ?? marker
      );
    }

    // フロアの個別バッジはルートノードのxを維持する(部屋からはみ出すときだけ左右クランプ)
    const placeBounds = marker.placeId ? resolvePlaceBounds(marker.placeId) : null;
    const roomLabel = placeBounds ? findLabelInsideBounds(mapLabels, placeBounds) : null;
    return (
      anchorWithin(marker, roomLabel, placeBounds, marker.coordinates.x) ??
      escapeEventMarkerFromLabels(marker, labelBounds, userUnitsPerPixel)
    );
  });

  return { markers: laidOutMarkers, anchoredLabelIds, anchoredLabelIdsByMarkerKey };
}

type CreateMapMarkerPresentationOptions = {
  currentPlace: Place | null;
  destinationPlace: Place | null;
  events: readonly CampusEvent[];
  floorId: string;
  focusPlace: Place | null;
  now?: Date;
  resolveCoordinates: (target: MarkerCoordinateTarget) => OverlayPoint | null;
  resolveElementBounds: (elementId: string) => OverlayBounds | null;
  resolveFloorSheetId: (floorId: string) => string | null;
  resolvePlace: (placeId: string) => Place | null;
};

/**
 * 現在時刻以降に始まるスロットが最も早いイベントを選ぶ。
 * 未実施スロットがない場合は、既存挙動を保つため入力順の先頭へ戻す。
 */
export function selectUpcomingEvent(
  events: readonly CampusEvent[],
  now = new Date(),
): CampusEvent | null {
  const nowTimestamp = now.getTime();
  let selectedEvent: CampusEvent | null = null;
  let selectedStart = Number.POSITIVE_INFINITY;

  for (const event of events) {
    for (const timeSlot of event.timeSlots) {
      const start = new Date(timeSlot.start).getTime();
      if (
        Number.isFinite(start) &&
        start >= nowTimestamp &&
        start < selectedStart
      ) {
        selectedEvent = event;
        selectedStart = start;
      }
    }
  }

  return selectedEvent ?? events[0] ?? null;
}

/** 次に代表イベントが切り替わり得る、開始時刻直後のtimestampを返す。 */
export function getNextEventSelectionChangeTimestamp(
  events: readonly CampusEvent[],
  now = new Date(),
): number | null {
  const nowTimestamp = now.getTime();
  let nextStart = Number.POSITIVE_INFINITY;

  for (const event of events) {
    for (const timeSlot of event.timeSlots) {
      const start = new Date(timeSlot.start).getTime();
      if (Number.isFinite(start) && start >= nowTimestamp && start < nextStart) {
        nextStart = start;
      }
    }
  }

  return Number.isFinite(nextStart) ? nextStart + 1 : null;
}

function resolveCampusBuildingId(
  place: Place,
  resolveFloorSheetId: (floorId: string) => string | null,
): CampusBuildingId | null {
  const sheetId = resolveFloorSheetId(place.floorId);
  if (!sheetId) {
    return null;
  }
  const buildingId = campusProjectionFrameBySheetId[sheetId]?.buildingId;
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

/** 屋内SVG内の点を、同じ相対位置にあるキャンパス建物bbox内の点へ写像する。 */
export function projectPointToCampusBuilding(
  point: OverlayPoint,
  sourceFrame: Pick<CampusProjectionFrame, "x" | "y" | "width" | "height">,
  buildingBounds: OverlayBounds,
): OverlayPoint | null {
  const targetWidth = buildingBounds.right - buildingBounds.left;
  const targetHeight = buildingBounds.bottom - buildingBounds.top;
  if (
    !Number.isFinite(point.x) ||
    !Number.isFinite(point.y) ||
    !Number.isFinite(sourceFrame.x) ||
    !Number.isFinite(sourceFrame.y) ||
    !(sourceFrame.width > 0) ||
    !(sourceFrame.height > 0) ||
    !Number.isFinite(buildingBounds.left) ||
    !Number.isFinite(buildingBounds.top) ||
    !(targetWidth > 0) ||
    !(targetHeight > 0)
  ) {
    return null;
  }

  const normalizedX = Math.min(
    Math.max((point.x - sourceFrame.x) / sourceFrame.width, 0),
    1,
  );
  const normalizedY = Math.min(
    Math.max((point.y - sourceFrame.y) / sourceFrame.height, 0),
    1,
  );
  return {
    x: buildingBounds.left + normalizedX * targetWidth,
    y: buildingBounds.top + normalizedY * targetHeight,
  };
}

function resolveRouteNodeCoordinates(
  place: Place,
  resolveCoordinates: (target: MarkerCoordinateTarget) => OverlayPoint | null,
): OverlayPoint | null {
  const routeNode = routeGraph.nodes.find(
    (node) => node.placeId === place.id && node.floorId === place.floorId,
  );
  if (!routeNode) {
    return null;
  }

  return resolveCoordinates({ kind: "route-node", node: routeNode });
}

function resolveEventCoordinates(
  place: Place,
  resolveCoordinates: (target: MarkerCoordinateTarget) => OverlayPoint | null,
): OverlayPoint | null {
  const routeNodeCoordinates = resolveRouteNodeCoordinates(
    place,
    resolveCoordinates,
  );
  if (routeNodeCoordinates) {
    return routeNodeCoordinates;
  }

  return resolveCoordinates({ kind: "place", place });
}

export function createMapMarkerPresentation({
  currentPlace,
  destinationPlace,
  events,
  floorId,
  focusPlace,
  now = new Date(),
  resolveCoordinates,
  resolveElementBounds,
  resolveFloorSheetId,
  resolvePlace,
}: CreateMapMarkerPresentationOptions): MapMarkerPlacement[] {
  const placements: MapMarkerPlacement[] = [];
  const eventsByPlaceId = new Map<
    string,
    {
      events: CampusEvent[];
      eventCount: number;
      colorKeys: Set<EventMarkerColorKey>;
    }
  >();
  const blockingPinPlaces = [currentPlace, focusPlace].filter(
    (place): place is Place => place !== null,
  );
  const blockingPinPlaceIds = new Set(blockingPinPlaces.map((place) => place.id));
  let destinationReplacement: PinMarkerPlacement["replacesEventMarker"];
  let projectedCurrent:
    | { buildingId: CampusBuildingId; coordinates: OverlayPoint }
    | null = null;

  if (
    floorId === DEFAULT_FLOOR_ID &&
    currentPlace &&
    currentPlace.floorId !== DEFAULT_FLOOR_ID
  ) {
    const sheetId = resolveFloorSheetId(currentPlace.floorId);
    const projectionFrame = sheetId
      ? campusProjectionFrameBySheetId[sheetId]
      : undefined;
    const sourceCoordinates = projectionFrame
      ? resolveRouteNodeCoordinates(currentPlace, resolveCoordinates)
      : null;
    const buildingBounds = projectionFrame
      ? resolveElementBounds(projectionFrame.buildingId)
      : null;
    const coordinates =
      projectionFrame && sourceCoordinates && buildingBounds
        ? projectPointToCampusBuilding(
            sourceCoordinates,
            projectionFrame,
            buildingBounds,
          )
        : null;
    if (projectionFrame && coordinates) {
      projectedCurrent = {
        buildingId: projectionFrame.buildingId,
        coordinates,
      };
    }
  }

  for (const event of events) {
    const group = eventsByPlaceId.get(event.placeId);
    eventsByPlaceId.set(event.placeId, {
      events: [...(group?.events ?? []), event],
      eventCount: (group?.eventCount ?? 0) + 1,
      colorKeys: new Set([
        ...(group?.colorKeys ?? []),
        getEventMarkerColorKey(event),
      ]),
    });
  }

  if (floorId === DEFAULT_FLOOR_ID) {
    const occupiedBuildingIds = new Set<CampusBuildingId>(
      blockingPinPlaces
        .filter((place) => place.floorId === DEFAULT_FLOOR_ID)
        .map((place) => resolveCampusBuildingId(place, resolveFloorSheetId))
        .filter((buildingId): buildingId is CampusBuildingId => buildingId !== null),
    );
    if (projectedCurrent) {
      occupiedBuildingIds.add(projectedCurrent.buildingId);
    }
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

      if (
        destinationPlace?.floorId === DEFAULT_FLOOR_ID &&
        resolveCampusBuildingId(destinationPlace, resolveFloorSheetId) === buildingId
      ) {
        destinationReplacement = { kind: "building", buildingId };
      }
    }

    for (const [placeId, { events: placeEvents, eventCount, colorKeys }] of eventsByPlaceId) {
      const place = resolvePlace(placeId);
      if (
        !place ||
        place.floorId !== DEFAULT_FLOOR_ID ||
        resolveCampusBuildingId(place, resolveFloorSheetId) !== null ||
        blockingPinPlaceIds.has(placeId)
      ) {
        continue;
      }
      const coordinates = resolveEventCoordinates(place, resolveCoordinates);
      if (!coordinates) {
        continue;
      }
      const selectedEvent = selectUpcomingEvent(placeEvents, now);
      if (!selectedEvent) {
        continue;
      }
      placements.push({
        type: "event",
        coordinates,
        markerLabel: `${place.name}のイベント${eventCount}件を表示: ${selectedEvent.title}`,
        action: { kind: "event", eventKey: selectedEvent.key },
        placeId: place.id,
        eventKey: selectedEvent.key,
        eventId: selectedEvent.id,
        eventCount,
        colorKey: getAggregatedEventMarkerColorKey(colorKeys),
      });

      if (destinationPlace?.id === placeId) {
        destinationReplacement = { kind: "place", placeId };
      }
    }
  } else {
    for (const [placeId, { events: placeEvents, colorKeys }] of eventsByPlaceId) {
      const place = resolvePlace(placeId);
      if (!place || place.floorId !== floorId || blockingPinPlaceIds.has(placeId)) {
        continue;
      }
      const coordinates = resolveEventCoordinates(place, resolveCoordinates);
      if (!coordinates) {
        continue;
      }
      const selectedEvent = selectUpcomingEvent(placeEvents, now);
      if (!selectedEvent) {
        continue;
      }
      placements.push({
        type: "event",
        coordinates,
        markerLabel: `${place.name}のイベントを表示: ${selectedEvent.title}`,
        action: { kind: "event", eventKey: selectedEvent.key },
        placeId: place.id,
        eventKey: selectedEvent.key,
        eventId: selectedEvent.id,
        colorKey: getAggregatedEventMarkerColorKey(colorKeys),
      });

      if (destinationPlace?.id === placeId) {
        destinationReplacement = { kind: "place", placeId };
      }
    }
  }

  const pins = [
    { place: currentPlace, markerKind: "current" },
    { place: destinationPlace, markerKind: "destination" },
    { place: focusPlace, markerKind: "focus" },
  ] as const;
  for (const pin of pins) {
    if (!pin.place) {
      continue;
    }
    const coordinates =
      pin.place.floorId === floorId
        ? resolveCoordinates({ kind: "place", place: pin.place })
        : pin.markerKind === "current" && floorId === DEFAULT_FLOOR_ID
          ? projectedCurrent?.coordinates ?? null
          : null;
    if (!coordinates) {
      continue;
    }
    placements.push({
      type: "pin",
      coordinates,
      markerKind: pin.markerKind,
      placeId: pin.place.id,
      ...(pin.markerKind === "destination" && destinationReplacement
        ? { replacesEventMarker: destinationReplacement }
        : {}),
    });
  }

  return placements;
}
