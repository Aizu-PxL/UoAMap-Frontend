import { describe, expect, test } from "bun:test";
import { exceedsMapTapMovement } from "./mapGesture";

describe("map tap gesture", () => {
  test("8px以内をtapとし、それを越えた移動をpanとして扱う", () => {
    expect(exceedsMapTapMovement({ x: 0, y: 0 }, { x: 6, y: 5 })).toEqual(false);
    expect(exceedsMapTapMovement({ x: 0, y: 0 }, { x: 8, y: 0 })).toEqual(false);
    expect(exceedsMapTapMovement({ x: 0, y: 0 }, { x: 8.01, y: 0 })).toEqual(true);
  });
});
