import { selectVisibleMapLabels } from "./mapLabels";
import type { MapLabel, MapLabelPlacement } from "./mapLabels";
import { getEventMarkerInkBounds, layoutEventMarkers } from "./mapMarkerPresentation";
import type {
  EventMarkerPlacement,
  MapMarkerPlacement,
  PinMarkerPlacement,
} from "./mapMarkerPresentation";
import { overlayBoundsIntersect } from "./mapOverlayGeometry";
import type { OverlayBounds } from "./mapOverlayGeometry";

// バッジとラベルの間に確保する最小の余白。退避後の残衝突判定にも使う
const MARKER_COLLISION_PADDING_PX = 2;

export interface CreateMapOverlayLayoutOptions {
  mapLabels: MapLabel[];
  markers: MapMarkerPlacement[];
  userUnitsPerPixel: number;
  isCampusOverview: boolean;
  /** 水滴ピンの除外矩形(ラベルより常に優先される) */
  getPinExclusionBounds: (marker: PinMarkerPlacement) => OverlayBounds;
  /** 建物SVG要素の外形bbox(俯瞰の集約バッジ用) */
  resolveElementBounds: (elementId: string) => OverlayBounds | null;
  /** Placeに対応するSVG要素(部屋)の外形bbox。座標指定Placeなどはnull */
  resolvePlaceBounds: (placeId: string) => OverlayBounds | null;
}

export interface MapOverlayLayout {
  labelPlacements: MapLabelPlacement[];
  markers: MapMarkerPlacement[];
}

function matchesReplacement(
  marker: EventMarkerPlacement,
  target: NonNullable<PinMarkerPlacement["replacesEventMarker"]>,
): boolean {
  return target.kind === "building"
    ? marker.buildingId === target.buildingId
    : marker.placeId === target.placeId;
}

function getEventMarkerKey(marker: EventMarkerPlacement): string | null {
  if (marker.buildingId) {
    return `building:${marker.buildingId}`;
  }
  return marker.placeId ? `place:${marker.placeId}` : null;
}

/**
 * ラベル確定 → バッジ配置 → 残衝突ラベルの除去、を1パスで解く。
 * ラベルとマーカーの両レイヤーがこの同じ結果を使うことで、位置の食い違いを防ぐ。
 */
export function createMapOverlayLayout({
  mapLabels,
  markers,
  userUnitsPerPixel,
  isCampusOverview,
  getPinExclusionBounds,
  resolveElementBounds,
  resolvePlaceBounds,
}: CreateMapOverlayLayoutOptions): MapOverlayLayout {
  const initialPinExclusionBounds = markers
    .filter(
      (marker): marker is PinMarkerPlacement =>
        marker.type === "pin" && marker.replacesEventMarker === undefined,
    )
    .map(getPinExclusionBounds);
  const selectedLabels = selectVisibleMapLabels({
    labels: mapLabels,
    userUnitsPerPixel,
    isCampusOverview,
    exclusionBounds: initialPinExclusionBounds,
  });

  const { markers: laidOutMarkers, anchoredLabelIdsByMarkerKey } = layoutEventMarkers({
    markers,
    labelPlacements: selectedLabels,
    mapLabels,
    userUnitsPerPixel,
    resolveElementBounds,
    resolvePlaceBounds,
  });

  const replacementCoordinates = new Map<PinMarkerPlacement, { x: number; y: number }>();
  const replacedEvents = new Set<EventMarkerPlacement>();
  for (const marker of laidOutMarkers) {
    if (marker.type !== "pin") {
      continue;
    }
    const replacementTarget = marker.replacesEventMarker;
    if (!replacementTarget) {
      continue;
    }
    const replacedEvent = laidOutMarkers.find(
      (candidate): candidate is EventMarkerPlacement =>
        candidate.type === "event" &&
        matchesReplacement(candidate, replacementTarget),
    );
    if (replacedEvent) {
      replacementCoordinates.set(marker, replacedEvent.coordinates);
      replacedEvents.add(replacedEvent);
    }
  }

  const finalMarkers = laidOutMarkers
    .filter((marker) => marker.type !== "event" || !replacedEvents.has(marker))
    .map((marker) => {
      if (marker.type !== "pin") {
        return marker;
      }
      const coordinates = replacementCoordinates.get(marker);
      return coordinates ? { ...marker, coordinates } : marker;
    });
  const finalPinBounds = finalMarkers
    .filter((marker): marker is PinMarkerPlacement => marker.type === "pin")
    .map(getPinExclusionBounds);
  const visibleAnchoredLabelIds = new Set(
    finalMarkers
      .filter((marker): marker is EventMarkerPlacement => marker.type === "event")
      .map(getEventMarkerKey)
      .filter((key): key is string => key !== null)
      .map((key) => anchoredLabelIdsByMarkerKey.get(key))
      .filter((labelId): labelId is string => labelId !== undefined),
  );

  // 重なりが残るラベルを落とす。ただしバッジのアンカー先(俯瞰は建物名、フロアは部屋名)は残す:
  // バッジの指し先そのものなので、消すとどの建物・どの部屋のイベントか読めなくなる。
  const badgeBounds = finalMarkers
    .filter((marker) => marker.type === "event")
    .map((marker) =>
      getEventMarkerInkBounds(marker, userUnitsPerPixel, MARKER_COLLISION_PADDING_PX),
    );

  const labelPlacements = selectedLabels.filter(
    (placement) =>
      !finalPinBounds.some((bounds) => overlayBoundsIntersect(placement.bounds, bounds)) &&
      (visibleAnchoredLabelIds.has(placement.label.id) ||
        !badgeBounds.some((bounds) => overlayBoundsIntersect(placement.bounds, bounds))),
  );

  return { labelPlacements, markers: finalMarkers };
}
