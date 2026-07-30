import { describe, expect, test } from "bun:test";
import {
  getAggregatedEventMarkerColorKey,
  getEventMarkerColorKey,
} from "./eventMarkerColor";

describe("event marker schedule colors", () => {
  test("正式ID先頭文字をタイムスケジュールの7色へ対応させる", () => {
    expect(
      ["A1", "L1", "E1", "U1", "P1", "T1", "M1", "G1", "R1"].map(
        (id) => getEventMarkerColorKey({ id }),
      ),
    ).toEqual([
      "explanation",
      "explanation",
      "explanation",
      "guardian",
      "open-lab",
      "tour",
      "trial-class",
      "consultation",
      "study",
    ]);
    expect(getEventMarkerColorKey({ id: undefined })).toEqual("default");
  });

  test("集約は単色だけを維持し混色をdefaultへ戻す", () => {
    expect(
      getAggregatedEventMarkerColorKey(["explanation", "explanation"]),
    ).toEqual("explanation");
    expect(
      getAggregatedEventMarkerColorKey(["explanation", "trial-class"]),
    ).toEqual("default");
  });
});
