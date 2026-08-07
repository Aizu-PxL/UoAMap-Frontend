import { describe, expect, test } from "bun:test";
import {
  clampScheduleScale,
  getNextScheduleScale,
  getPinchScheduleScale,
  SCHEDULE_MAX_SCALE,
  SCHEDULE_MIN_SCALE,
} from "./scheduleZoom";

describe("schedule image zoom", () => {
  test("scaleを許容範囲へclampする", () => {
    expect(clampScheduleScale(0)).toEqual(SCHEDULE_MIN_SCALE);
    expect(clampScheduleScale(4)).toEqual(SCHEDULE_MAX_SCALE);
    expect(clampScheduleScale(Number.NaN)).toEqual(1);
  });

  test("拡大・縮小ボタンのscaleを段階的に変更する", () => {
    expect(getNextScheduleScale(1, "in")).toEqual(1.25);
    expect(getNextScheduleScale(1, "out")).toEqual(0.75);
    expect(getNextScheduleScale(SCHEDULE_MAX_SCALE, "in")).toEqual(SCHEDULE_MAX_SCALE);
    expect(getNextScheduleScale(SCHEDULE_MIN_SCALE, "out")).toEqual(SCHEDULE_MIN_SCALE);
  });

  test("ピンチ距離の比率でscaleを変更し、範囲外をclampする", () => {
    expect(getPinchScheduleScale(1, 100, 150)).toEqual(1.5);
    expect(getPinchScheduleScale(2, 100, 10)).toEqual(SCHEDULE_MIN_SCALE);
    expect(getPinchScheduleScale(2, 100, 300)).toEqual(SCHEDULE_MAX_SCALE);
    expect(getPinchScheduleScale(2, 0, 100)).toEqual(2);
  });
});
