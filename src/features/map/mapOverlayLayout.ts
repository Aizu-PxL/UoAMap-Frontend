import { campusAggregateBuildingLabelIds, selectVisibleMapLabels } from "./mapLabels";
import type { MapLabel, MapLabelPlacement } from "./mapLabels";
import { getEventMarkerInkBounds, layoutEventMarkers } from "./mapMarkerPresentation";
import type { MapMarkerPlacement } from "./mapMarkerPresentation";
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
  pinExclusionBounds: OverlayBounds[];
  resolveElementBounds: (elementId: string) => OverlayBounds | null;
}

export interface MapOverlayLayout {
  labelPlacements: MapLabelPlacement[];
  markers: MapMarkerPlacement[];
}

/**
 * ラベル確定 → バッジ退避 → 残衝突ラベルの除去、を1パスで解く。
 * ラベルとマーカーの両レイヤーがこの同じ結果を使うことで、位置の食い違いを防ぐ。
 */
export function createMapOverlayLayout({
  mapLabels,
  markers,
  userUnitsPerPixel,
  isCampusOverview,
  pinExclusionBounds,
  resolveElementBounds,
}: CreateMapOverlayLayoutOptions): MapOverlayLayout {
  const selectedLabels = selectVisibleMapLabels({
    labels: mapLabels,
    userUnitsPerPixel,
    isCampusOverview,
    exclusionBounds: pinExclusionBounds,
  });

  const laidOutMarkers = layoutEventMarkers({
    markers,
    labelPlacements: selectedLabels,
    mapLabels,
    userUnitsPerPixel,
    resolveElementBounds,
  });

  // 退避しても重なりが残るラベルを落とす。ただし集約バッジのアンカーとなる5建物名だけは残す:
  // 俯瞰の主要な道標であり、バッジの指し先そのものなので消すと何件の建物か読めなくなる。
  const badgeBounds = laidOutMarkers
    .filter((marker) => marker.type === "event")
    .map((marker) =>
      getEventMarkerInkBounds(marker, userUnitsPerPixel, MARKER_COLLISION_PADDING_PX),
    );
  const isProtectedFromBadges = (labelId: string) =>
    isCampusOverview && campusAggregateBuildingLabelIds.has(labelId);

  const labelPlacements = selectedLabels.filter(
    (placement) =>
      isProtectedFromBadges(placement.label.id) ||
      !badgeBounds.some((bounds) => overlayBoundsIntersect(placement.bounds, bounds)),
  );

  return { labelPlacements, markers: laidOutMarkers };
}
