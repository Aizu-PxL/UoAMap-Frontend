import { selectVisibleMapLabels } from "./mapLabels";
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
  /** 建物SVG要素の外形bbox(俯瞰の集約バッジ用) */
  resolveElementBounds: (elementId: string) => OverlayBounds | null;
  /** Placeに対応するSVG要素(部屋)の外形bbox。座標指定Placeなどはnull */
  resolvePlaceBounds: (placeId: string) => OverlayBounds | null;
}

export interface MapOverlayLayout {
  labelPlacements: MapLabelPlacement[];
  markers: MapMarkerPlacement[];
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
  pinExclusionBounds,
  resolveElementBounds,
  resolvePlaceBounds,
}: CreateMapOverlayLayoutOptions): MapOverlayLayout {
  const selectedLabels = selectVisibleMapLabels({
    labels: mapLabels,
    userUnitsPerPixel,
    isCampusOverview,
    exclusionBounds: pinExclusionBounds,
  });

  const { markers: laidOutMarkers, anchoredLabelIds } = layoutEventMarkers({
    markers,
    labelPlacements: selectedLabels,
    mapLabels,
    userUnitsPerPixel,
    resolveElementBounds,
    resolvePlaceBounds,
  });

  // 重なりが残るラベルを落とす。ただしバッジのアンカー先(俯瞰は建物名、フロアは部屋名)は残す:
  // バッジの指し先そのものなので、消すとどの建物・どの部屋のイベントか読めなくなる。
  const badgeBounds = laidOutMarkers
    .filter((marker) => marker.type === "event")
    .map((marker) =>
      getEventMarkerInkBounds(marker, userUnitsPerPixel, MARKER_COLLISION_PADDING_PX),
    );

  const labelPlacements = selectedLabels.filter(
    (placement) =>
      anchoredLabelIds.has(placement.label.id) ||
      !badgeBounds.some((bounds) => overlayBoundsIntersect(placement.bounds, bounds)),
  );

  return { labelPlacements, markers: laidOutMarkers };
}
