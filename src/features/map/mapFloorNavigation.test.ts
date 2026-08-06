import { describe, expect, test } from "bun:test";
import {
  DEFAULT_FLOOR_ID,
  getFloorLabel,
  getSelectableFloorIds,
  isSameBuilding,
} from "./mapFloorNavigation";

describe("mapFloorNavigation", () => {
  test("建物ごとのフロア選択肢を返し、単一フロアとキャンパスには返さない", () => {
    expect(getSelectableFloorIds("lh-1f")).toEqual(["lh-1f", "lh-2f"]);
    expect(getSelectableFloorIds("rq-3f")).toEqual(["rq-1f", "rq-2f", "rq-3f"]);
    expect(getSelectableFloorIds("ubic-1f")).toBeNull();
    expect(getSelectableFloorIds(DEFAULT_FLOOR_ID)).toBeNull();
  });

  test("フロア表示ラベルを作る", () => {
    expect(getFloorLabel("lh-1f")).toEqual("1F");
    expect(getFloorLabel("rq-3f")).toEqual("3F");
  });

  test("同じ建物のフロアだけを同一建物として判定する", () => {
    expect(isSameBuilding("lh-1f", "lh-2f")).toEqual(true);
    expect(isSameBuilding("rq-1f", "rq-3f")).toEqual(true);
    expect(isSameBuilding("lh-1f", "rq-1f")).toEqual(false);
    expect(isSameBuilding("campus", "lh-1f")).toEqual(false);
  });
});
