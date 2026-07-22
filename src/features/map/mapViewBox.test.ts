import { describe, expect, test } from "bun:test";
import {
  focusMapViewBox,
  getProportionalMapViewBox,
  panMapViewBox,
  parseMapViewBox,
  serializeMapViewBox,
  zoomMapViewBoxAt,
} from "./mapViewBox";

const original = { x: 100, y: 200, width: 800, height: 400 };

function getErrorMessage(action: () => unknown) {
  try {
    action();
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

describe("mapViewBox", () => {
  test("viewBox属性の空白とcommaを解析する", () => {
    expect(
      parseMapViewBox({
        viewBox: " 10, 20  300,400 ",
        width: "999",
        height: "999",
      }),
    ).toEqual({ x: 10, y: 20, width: 300, height: 400 });
  });

  test("viewBox属性が存在する場合は不正値をwidth/heightへfallbackしない", () => {
    expect(
      getErrorMessage(() =>
        parseMapViewBox({ viewBox: "0 0 0 400", width: "300", height: "400" }),
      ),
    ).toEqual("Invalid SVG viewBox");
    expect(
      getErrorMessage(() =>
        parseMapViewBox({ viewBox: "0 0 NaN 400", width: "300", height: "400" }),
      ),
    ).toEqual("Invalid SVG viewBox");
  });

  test("viewBox未指定時は単位付きwidth/heightの数値部分へfallbackする", () => {
    expect(
      parseMapViewBox({ viewBox: null, width: "210mm", height: "297mm" }),
    ).toEqual({ x: 0, y: 0, width: 210, height: 297 });
    expect(
      getErrorMessage(() =>
        parseMapViewBox({ viewBox: null, width: "0", height: "297" }),
      ),
    ).toEqual("Invalid SVG viewBox");
  });

  test("focusは元viewBoxの40%へ縮小し地点を横中央・上から20%へ置く", () => {
    expect(focusMapViewBox(original, { x: 500, y: 300 }, 0.4, 0.2)).toEqual({
      x: 340,
      y: 268,
      width: 320,
      height: 160,
    });
  });

  test("anchor zoomはアンカー位置を保ち元viewBoxの1/8〜2倍へ制限する", () => {
    const anchor = { x: 300, y: 300 };
    expect(zoomMapViewBoxAt(original, original, anchor, 0.5)).toEqual({
      x: 200,
      y: 250,
      width: 400,
      height: 200,
    });
    expect(zoomMapViewBoxAt(original, original, anchor, 0.01)).toEqual({
      x: 275,
      y: 287.5,
      width: 100,
      height: 50,
    });
    expect(zoomMapViewBoxAt(original, original, anchor, 10)).toEqual({
      x: -100,
      y: 100,
      width: 1600,
      height: 800,
    });
  });

  test("panはpointer-down時のviewBoxへSVG座標差分を加える", () => {
    expect(
      panMapViewBox(original, { x: 250, y: 260 }, { x: 230, y: 300 }),
    ).toEqual({ x: 120, y: 160, width: 800, height: 400 });
  });

  test("フロア切替は中心位置と表示割合を新しい元viewBoxへ比例変換する", () => {
    expect(
      getProportionalMapViewBox(
        { x: 300, y: 300, width: 400, height: 200 },
        original,
        { x: -100, y: 50, width: 1600, height: 1200 },
      ),
    ).toEqual({ x: 300, y: 350, width: 800, height: 600 });
  });

  test("viewBox属性用文字列をx y width height順で生成する", () => {
    expect(
      serializeMapViewBox({ x: -1.5, y: 2, width: 300.25, height: 400 }),
    ).toEqual("-1.5 2 300.25 400");
  });
});
