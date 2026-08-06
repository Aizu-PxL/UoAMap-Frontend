import { describe, expect, test } from "bun:test";
import { getPlace } from "../data/places";
import type { Place } from "../data/types";
import { createMapNavigationPresentation } from "./mapNavigation";

function place(placeId: string): Place {
  const value = getPlace(placeId);
  if (!value) {
    throw new Error(`Test place not found: ${placeId}`);
  }
  return value;
}

function createPresentation(options: {
  requestedFocusPlace?: Place | null;
  focusPlace?: Place | null;
  currentPlace?: Place | null;
  destinationPlace?: Place | null;
}) {
  return createMapNavigationPresentation({
    requestedFocusPlace: options.requestedFocusPlace ?? null,
    focusPlace: options.focusPlace ?? null,
    currentPlace: options.currentPlace ?? null,
    destinationPlace: options.destinationPlace ?? null,
  });
}

describe("map navigation presentation", () => {
  test("現在地と目的地の直URL相当では現在地を初期表示し全フロアの経路を作る", () => {
    const result = createPresentation({
      currentPlace: place("main_node_11"),
      destinationPlace: place("lh_room_m2"),
    });

    expect(result.mapFocusPlace?.id).toEqual("main_node_11");
    expect([...result.routePresentation.floorIds].sort()).toEqual([
      "campus",
      "lh-1f",
      "lh-2f",
    ]);
  });

  test("目的地だけなら目的地を初期表示し経路は空にする", () => {
    const result = createPresentation({
      destinationPlace: place("lh_room_m2"),
    });

    expect(result.mapFocusPlace?.id).toEqual("lh_room_m2");
    expect([...result.routePresentation.floorIds]).toEqual([]);
  });

  test("現在地だけなら現在地を初期表示し経路は空にする", () => {
    const result = createPresentation({
      currentPlace: place("main_node_11"),
    });

    expect(result.mapFocusPlace?.id).toEqual("main_node_11");
    expect([...result.routePresentation.floorIds]).toEqual([]);
  });

  test("明示的な一時フォーカスとURL focusはルート開始地点より優先する", () => {
    const currentPlace = place("main_node_11");
    const destinationPlace = place("lh_room_m2");
    const focusPlace = place("lh_room_m3");

    expect(
      createPresentation({
        requestedFocusPlace: destinationPlace,
        focusPlace,
        currentPlace,
        destinationPlace,
      }).mapFocusPlace?.id,
    ).toEqual("lh_room_m2");
    expect(
      createPresentation({
        focusPlace,
        currentPlace,
        destinationPlace,
      }).mapFocusPlace?.id,
    ).toEqual("lh_room_m3");
  });

  test("位置情報なしの現在地では目的地を初期表示し経路を作らない", () => {
    const result = createPresentation({
      currentPlace: place("campus-all"),
      destinationPlace: place("lh_room_m2"),
    });

    expect(result.mapFocusPlace?.id).toEqual("lh_room_m2");
    expect([...result.routePresentation.floorIds]).toEqual([]);
  });
});
