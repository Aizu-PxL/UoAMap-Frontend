import { describe, expect, test } from "bun:test";
import {
  getAnchoredOverlayBounds,
  getCenteredLabelBounds,
  getCenteredLineOffsetsEm,
  isOverlayBoundsExcluded,
  mapAnchoredLocalPoint,
  overlayBoundsIntersect,
} from "./mapOverlayGeometry";

describe("map overlay geometry", () => {
  test("イベント円中心は地点の20px上、ピン先端は地点座標へ固定する", () => {
    const anchor = { x: 125.5, y: 240.25 };

    for (const scale of [0.25, 1, 3.5]) {
      expect(
        mapAnchoredLocalPoint({ x: 12, y: 12 }, anchor, scale, { x: 12, y: 32 }),
      ).toEqual({ x: anchor.x, y: anchor.y - 20 * scale });
      expect(
        mapAnchoredLocalPoint(
          { x: 25, y: 45.83 },
          anchor,
          scale,
          { x: 25, y: 45.83 },
        ),
      ).toEqual(anchor);
    }
  });

  test("複数行の行位置を見た目中心の上下へ配置する", () => {
    expect(getCenteredLineOffsetsEm([0], 1)).toEqual([0]);
    expect(getCenteredLineOffsetsEm([0, 1.2, 2.4], 3)).toEqual([-1.2, 0, 1.2]);
    expect(getCenteredLineOffsetsEm([0], 3)).toEqual([-1.2, 0, 1.2]);
  });

  test("中央ラベルと画面固定マーカーの交差だけを検出する", () => {
    const labelBounds = getCenteredLabelBounds(
      { x: 100, y: 100 },
      ["104F"],
      [0],
      12,
      0.95,
      2,
    );
    const overlappingMarker = getAnchoredOverlayBounds(
      { left: 0, top: 0, right: 24, bottom: 24 },
      { x: 100, y: 100 },
      1,
      { x: 12, y: 12 },
      2,
    );
    const separateMarker = getAnchoredOverlayBounds(
      { left: 0, top: 0, right: 24, bottom: 24 },
      { x: 160, y: 100 },
      1,
      { x: 12, y: 12 },
      2,
    );

    expect(overlayBoundsIntersect(labelBounds, overlappingMarker)).toEqual(true);
    expect(overlayBoundsIntersect(labelBounds, separateMarker)).toEqual(false);
    expect(isOverlayBoundsExcluded(labelBounds, [overlappingMarker])).toEqual(true);
    expect(isOverlayBoundsExcluded(labelBounds, [])).toEqual(false);
  });
});
