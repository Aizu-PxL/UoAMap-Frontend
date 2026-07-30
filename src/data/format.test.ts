import { describe, expect, test } from "bun:test";
import { formatTimeSlot, formatTimeSlots } from "./format";

describe("event time formatting", () => {
  test("開始・終了時刻を表示する", () => {
    expect(
      formatTimeSlot({
        start: "2026-08-08T09:30:00+09:00",
        end: "2026-08-08T10:00:00+09:00",
      }),
    ).toEqual("9:30〜10:00");
  });

  test("終了時刻が未公表なら開始時刻だけを表示する", () => {
    expect(formatTimeSlot({ start: "2026-08-08T09:40:00+09:00" })).toEqual(
      "9:40〜",
    );
  });

  test("休憩を挟む複数枠を区切って表示する", () => {
    expect(
      formatTimeSlots([
        {
          start: "2026-08-08T10:00:00+09:00",
          end: "2026-08-08T12:00:00+09:00",
        },
        {
          start: "2026-08-08T13:00:00+09:00",
          end: "2026-08-08T15:00:00+09:00",
        },
      ]),
    ).toEqual("10:00〜12:00 / 13:00〜15:00");
  });
});
