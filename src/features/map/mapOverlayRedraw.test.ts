import { describe, expect, test } from "bun:test";
import { getMapOverlayRedrawKey } from "./mapOverlayRedraw";

const viewBox = { x: 10, y: 20, width: 300, height: 400 };
const container = { width: 402, height: 874 };

describe("getMapOverlayRedrawKey", () => {
  test("panによるviewBox x/y変更では再生成キーを維持する", () => {
    expect(
      getMapOverlayRedrawKey(viewBox, container),
    ).toEqual(
      getMapOverlayRedrawKey({ ...viewBox, x: -200, y: 800 }, container),
    );
  });

  test("zoomによるviewBox width/height変更では再生成キーを変える", () => {
    expect(
      getMapOverlayRedrawKey(viewBox, container) ===
        getMapOverlayRedrawKey(
          { ...viewBox, width: 150, height: 200 },
          container,
        ),
    ).toEqual(false);
  });

  test("live resizeによるcontainer width/height変更では再生成キーを変える", () => {
    expect(
      getMapOverlayRedrawKey(viewBox, container) ===
        getMapOverlayRedrawKey(viewBox, { width: 1440, height: 900 }),
    ).toEqual(false);
  });
});
