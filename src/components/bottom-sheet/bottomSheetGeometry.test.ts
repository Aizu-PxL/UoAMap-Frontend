import { describe, expect, test } from "bun:test";
import {
  clampBottomSheetHeight,
  getBottomSheetDragHeight,
  getExpandedBottomSheetHeight,
  getNearestBottomSheetSnapPoint,
  getNextBottomSheetSnapPoint,
} from "./bottomSheetGeometry";

describe("bottomSheetGeometry", () => {
  test("heightを22〜82svhへclampする", () => {
    expect([
      clampBottomSheetHeight(-1),
      clampBottomSheetHeight(22),
      clampBottomSheetHeight(50),
      clampBottomSheetHeight(82),
      clampBottomSheetHeight(100),
    ]).toEqual([22, 22, 50, 82, 82]);
  });

  test("pointer移動量をviewport比のsvhへ換算してclampする", () => {
    expect(
      getBottomSheetDragHeight({
        startY: 400,
        clientY: 300,
        startHeight: 58,
        viewportHeight: 1000,
      }),
    ).toEqual(68);
    expect(
      getBottomSheetDragHeight({
        startY: 400,
        clientY: 1000,
        startHeight: 58,
        viewportHeight: 1000,
      }),
    ).toEqual(22);
    expect(
      getBottomSheetDragHeight({
        startY: 400,
        clientY: 0,
        startHeight: 58,
        viewportHeight: 0,
      }),
    ).toEqual(82);
  });

  test("nearestは同距離なら低いsnap pointを選ぶ", () => {
    expect(
      [0, 22, 40, 41, 58, 70, 71, 82, 100].map(
        getNearestBottomSheetSnapPoint,
      ),
    ).toEqual([22, 22, 22, 58, 58, 58, 82, 82, 82]);
  });

  test("double-clickはnearestを基準に22→58→82→22と循環する", () => {
    expect(
      [22, 40, 58, 70, 82].map(getNextBottomSheetSnapPoint),
    ).toEqual([58, 58, 82, 82, 22]);
  });

  test("expand requestは22だけを58へ上げ、58と82を縮めない", () => {
    expect([22, 58, 82].map(getExpandedBottomSheetHeight)).toEqual([
      58, 58, 82,
    ]);
  });
});
