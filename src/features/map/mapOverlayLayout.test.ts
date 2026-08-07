import { describe, expect, test } from "bun:test";
import type { MapLabel } from "./mapLabels";
import type { EventMarkerPlacement } from "./mapMarkerPresentation";
import { createMapOverlayLayout } from "./mapOverlayLayout";
import type { OverlayBounds } from "./mapOverlayGeometry";

function label(
  id: string,
  lines: string[],
  center: { x: number; y: number },
  lineOffsetsEm: number[] = [0],
): MapLabel {
  return {
    id,
    lines,
    lineOffsetsEm,
    center,
    originalFontSize: 12,
    sourceWasHidden: false,
    visibilityAncestors: [],
  };
}

function layout(options: {
  mapLabels: MapLabel[];
  markers: EventMarkerPlacement[];
  userUnitsPerPixel: number;
  isCampusOverview?: boolean;
  buildingBounds?: OverlayBounds | null;
}) {
  return createMapOverlayLayout({
    mapLabels: options.mapLabels,
    markers: options.markers,
    userUnitsPerPixel: options.userUnitsPerPixel,
    isCampusOverview: options.isCampusOverview ?? false,
    pinExclusionBounds: [],
    resolveElementBounds: () => options.buildingBounds ?? null,
  });
}

function renderedLabelIds(result: ReturnType<typeof layout>): string[] {
  return result.labelPlacements.map((placement) => placement.label.id);
}

const studentHallBadge: EventMarkerPlacement = {
  type: "event",
  coordinates: { x: 10, y: 20 },
  markerLabel: "学生ホール、イベント2件。建物を表示",
  action: { kind: "floor", floorId: "sh-1f" },
  buildingId: "building_StudentHall",
  eventCount: 2,
  colorKey: "default",
};

describe("createMapOverlayLayout", () => {
  test("退避しきれず重なりが残るラベルだけを落とす", () => {
    // 4行ラベルは半高27.6pxあり、退避上限32pxでは抜けきれない
    const tallLabel = label("text_tall", ["AAAA", "BBBB", "CCCC", "DDDD"], { x: 0, y: 0 }, [
      0, 1.2, 2.4, 3.6,
    ]);
    const farLabel = label("text_far", ["別の場所"], { x: 500, y: 500 });
    const result = layout({
      mapLabels: [tallLabel, farLabel],
      markers: [
        {
          type: "event",
          coordinates: { x: 0, y: 0 },
          markerLabel: "会場のイベントを表示",
          action: { kind: "event", eventKey: "E1" },
          placeId: "venue",
          eventKey: "E1",
          colorKey: "default",
        },
      ],
      userUnitsPerPixel: 1,
    });

    expect(renderedLabelIds(result)).toEqual(["text_far"]);
    // 退避自体は上限まで行われている
    expect(result.markers[0]?.coordinates.y).toEqual(-32);
  });

  test("退避で解消したラベルは残す", () => {
    const roomLabel = label("text_room", ["267"], { x: 0, y: 0 });
    const result = layout({
      mapLabels: [roomLabel],
      markers: [
        {
          type: "event",
          coordinates: { x: 0, y: 0 },
          markerLabel: "会場のイベントを表示",
          action: { kind: "event", eventKey: "E1" },
          placeId: "venue",
          eventKey: "E1",
          colorKey: "default",
        },
      ],
      userUnitsPerPixel: 1,
    });

    expect(renderedLabelIds(result)).toEqual(["text_room"]);
    expect(result.markers[0]?.coordinates.y).toBeLessThan(0);
  });

  test("クランプしていない集約バッジはアンカー先建物名を残し、他のラベルは落とす", () => {
    const result = layout({
      mapLabels: [
        label("text_StudentHall", ["学生ホール"], { x: 100, y: 200 }),
        label("text_Cafeteria", ["食堂"], { x: 100, y: 152 }),
      ],
      markers: [studentHallBadge],
      userUnitsPerPixel: 2,
      isCampusOverview: true,
      buildingBounds: { left: 0, top: 0, right: 300, bottom: 400 },
    });

    expect(renderedLabelIds(result)).toEqual(["text_StudentHall"]);
  });

  test("建物外形へクランプしても建物名は残す", () => {
    const result = layout({
      mapLabels: [label("text_StudentHall", ["学生ホール"], { x: 100, y: 200 })],
      markers: [studentHallBadge],
      userUnitsPerPixel: 2,
      isCampusOverview: true,
      buildingBounds: { left: 80, top: 140, right: 200, bottom: 260 },
    });

    // ラベル直上のy=152から建物内へ押し戻されている
    expect(result.markers[0]?.coordinates.y).toBeGreaterThan(152);
    expect(renderedLabelIds(result)).toEqual(["text_StudentHall"]);
  });

  test("建物が極端に小さくてもアンカー点は外形内に留め、建物名は消さない", () => {
    const buildingBounds = { left: 90, top: 170, right: 150, bottom: 230 };
    const result = layout({
      mapLabels: [label("text_StudentHall", ["学生ホール"], { x: 100, y: 200 })],
      markers: [studentHallBadge],
      userUnitsPerPixel: 2,
      isCampusOverview: true,
      buildingBounds,
    });

    const coordinates = result.markers[0]?.coordinates;
    expect(coordinates?.x).toBeGreaterThanOrEqual(buildingBounds.left);
    expect(coordinates?.x).toBeLessThanOrEqual(buildingBounds.right);
    expect(coordinates?.y).toBeGreaterThanOrEqual(buildingBounds.top);
    expect(coordinates?.y).toBeLessThanOrEqual(buildingBounds.bottom);
    expect(renderedLabelIds(result)).toEqual(["text_StudentHall"]);
  });
});
