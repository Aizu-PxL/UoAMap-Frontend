import { describe, expect, test } from "bun:test";
import {
  clampScheduleScale,
  getNextScheduleScale,
  getPinchScheduleScale,
  getScheduleFocalScroll,
  getScheduleZoomAnchor,
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

  test("焦点が指す画像上の等倍座標を求める", () => {
    expect(getScheduleZoomAnchor(200, 10, 1)).toEqual(190);
    expect(getScheduleZoomAnchor(200, 10, 2)).toEqual(95);
    expect(getScheduleZoomAnchor(200, 10, 0)).toEqual(0);
    expect(getScheduleZoomAnchor(200, 10, Number.NaN)).toEqual(0);
  });

  test("倍率を変えても焦点のクライアント座標が動かない", () => {
    // 画像原点がclientX=10、スクロール40の状態でclientX=200をピンチした
    const imageOriginClient = 10;
    const startScroll = 40;
    const scrollOrigin = imageOriginClient + startScroll;
    const focalClient = 200;
    const anchor = getScheduleZoomAnchor(focalClient, imageOriginClient, 1);

    // 同倍率なら現在のスクロール位置のまま
    expect(getScheduleFocalScroll(scrollOrigin, anchor, 1, focalClient)).toEqual(startScroll);

    for (const nextScale of [0.75, 1.5, 2, 3]) {
      const nextScroll = getScheduleFocalScroll(scrollOrigin, anchor, nextScale, focalClient);
      // 変形後の画像原点 = scrollOrigin - スクロール位置
      expect(scrollOrigin - nextScroll + anchor * nextScale).toEqual(focalClient);
    }
  });

  test("焦点が動いた分だけスクロールが逆向きに追従する", () => {
    const scrollOrigin = 50;
    const anchor = 190;

    expect(getScheduleFocalScroll(scrollOrigin, anchor, 1, 200)).toEqual(40);
    expect(getScheduleFocalScroll(scrollOrigin, anchor, 1, 260)).toEqual(-20);
    expect(getScheduleFocalScroll(scrollOrigin, anchor, 1, Number.NaN)).toEqual(0);
  });
});
