import { describe, expect, test } from "bun:test";
import { getMeetUserUnitsPerPixel } from "./mapViewportScale";

const campusViewBox = {
  width: 679.51618,
  height: 736.72698,
};

describe("getMeetUserUnitsPerPixel", () => {
  test("縦長画面では幅基準の逆スケールを返す", () => {
    const scale = getMeetUserUnitsPerPixel(campusViewBox, {
      width: 402,
      height: 874,
    });

    expect(
      scale !== null && Math.abs(scale - campusViewBox.width / 402) < 1e-10,
    ).toEqual(true);
  });

  test("横長画面では高さ基準の逆スケールを返す", () => {
    const scale = getMeetUserUnitsPerPixel(campusViewBox, {
      width: 1440,
      height: 900,
    });

    expect(
      scale !== null && Math.abs(scale - campusViewBox.height / 900) < 1e-10,
    ).toEqual(true);
  });

  test("viewBoxまたはコンテナの寸法が0ならnullを返す", () => {
    expect(
      getMeetUserUnitsPerPixel(campusViewBox, {
        width: 0,
        height: 874,
      }),
    ).toBeNull();
    expect(
      getMeetUserUnitsPerPixel(
        {
          width: 0,
          height: campusViewBox.height,
        },
        {
          width: 402,
          height: 874,
        },
      ),
    ).toBeNull();
  });
});
