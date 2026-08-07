import { describe, expect, test } from "bun:test";
import type { MapLabel } from "./mapLabels";
import type {
  EventMarkerPlacement,
  MapMarkerPlacement,
  PinMarkerPlacement,
} from "./mapMarkerPresentation";
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
  markers: MapMarkerPlacement[];
  userUnitsPerPixel: number;
  isCampusOverview?: boolean;
  buildingBounds?: OverlayBounds | null;
  placeBounds?: OverlayBounds | null;
}) {
  return createMapOverlayLayout({
    mapLabels: options.mapLabels,
    markers: options.markers,
    userUnitsPerPixel: options.userUnitsPerPixel,
    isCampusOverview: options.isCampusOverview ?? false,
    getPinExclusionBounds: (marker: PinMarkerPlacement) => ({
      left: marker.coordinates.x - 12,
      top: marker.coordinates.y - 48,
      right: marker.coordinates.x + 12,
      bottom: marker.coordinates.y,
    }),
    resolveElementBounds: () => options.buildingBounds ?? null,
    resolvePlaceBounds: () => options.placeBounds ?? null,
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

  test("狭い部屋でバッジと重なってもアンカー先の部屋名は残す", () => {
    const roomLabel = label("text_room", ["144"], { x: 50, y: 16.5 });
    const otherLabel = label("text_other", ["143"], { x: 50, y: -16 });
    const result = layout({
      mapLabels: [roomLabel, otherLabel],
      markers: [
        {
          type: "event",
          coordinates: { x: 50, y: 16.5 },
          markerLabel: "144のイベントを表示",
          action: { kind: "event", eventKey: "E1" },
          placeId: "room",
          eventKey: "E1",
          colorKey: "default",
        },
      ],
      userUnitsPerPixel: 1,
      placeBounds: { left: 0, top: 0, right: 100, bottom: 33 },
    });

    // アンカー先の144は残り、はみ出し先の隣室143はバッジに譲る
    expect(renderedLabelIds(result)).toEqual(["text_room"]);
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

  test("個別イベントのバッジだけを最終出力から除き目的地pinの座標は動かさない", () => {
    const roomLabel = label("text_room", ["267"], { x: 70, y: 80 });
    const eventMarker: EventMarkerPlacement = {
      type: "event",
      coordinates: { x: 70, y: 80 },
      markerLabel: "会場のイベントを表示",
      action: { kind: "event", eventKey: "E1" },
      placeId: "venue",
      eventKey: "E1",
      colorKey: "default",
    };
    const badgeOnly = layout({
      mapLabels: [roomLabel],
      markers: [eventMarker],
      userUnitsPerPixel: 1,
    });
    const replaced = layout({
      mapLabels: [roomLabel],
      markers: [
        eventMarker,
        {
          type: "pin",
          coordinates: { x: 5, y: 6 },
          markerKind: "destination",
          placeId: "venue",
          replacesEventMarker: { kind: "place", placeId: "venue" },
        },
      ],
      userUnitsPerPixel: 1,
    });

    // バッジ単独ならラベル回避で元座標(70, 80)の直上へ退避する。
    // ピン先端はルート終端(createMapMarkerPresentationが決めた座標)のままで、そこへは引き寄せられない
    expect(badgeOnly.markers[0]?.coordinates.x).toEqual(70);
    expect(badgeOnly.markers[0]?.coordinates.y).toBeLessThan(80);
    expect(replaced.markers).toEqual([
      {
        type: "pin",
        coordinates: { x: 5, y: 6 },
        markerKind: "destination",
        placeId: "venue",
        replacesEventMarker: { kind: "place", placeId: "venue" },
      },
    ]);
    expect(replaced.markers.some((marker) => marker.type === "event")).toEqual(false);
    expect(renderedLabelIds(replaced)).toEqual(["text_room"]);
  });

  test("キャンパス集約バッジを除いても目的地pinの座標は動かさない", () => {
    const studentHall = label("text_StudentHall", ["学生ホール"], { x: 100, y: 200 });
    const badgeOnly = layout({
      mapLabels: [studentHall],
      markers: [studentHallBadge],
      userUnitsPerPixel: 2,
      isCampusOverview: true,
      buildingBounds: { left: 0, top: 0, right: 300, bottom: 400 },
    });
    const replaced = layout({
      mapLabels: [studentHall],
      markers: [
        studentHallBadge,
        {
          type: "pin",
          coordinates: { x: 10, y: 20 },
          markerKind: "destination",
          placeId: "student-hall",
          replacesEventMarker: {
            kind: "building",
            buildingId: "building_StudentHall",
          },
        },
      ],
      userUnitsPerPixel: 2,
      isCampusOverview: true,
      buildingBounds: { left: 0, top: 0, right: 300, bottom: 400 },
    });

    // 集約バッジ単独なら建物名ラベル直上(100, 152)へ置かれるが、ピンはその座標を引き継がない
    expect(badgeOnly.markers[0]?.coordinates).toEqual({ x: 100, y: 152 });
    expect(replaced.markers.length).toEqual(1);
    expect(replaced.markers[0]).toMatchObject({
      type: "pin",
      coordinates: { x: 10, y: 20 },
      markerKind: "destination",
    });
  });

  test("目的地pinはラベルを落とさず現在地・注目pinはバッジ配置より前に落とす", () => {
    const coveredLabel = label("text_covered", ["267"], { x: 0, y: 0 });
    const otherBadge: EventMarkerPlacement = {
      type: "event",
      coordinates: { x: 0, y: 0 },
      markerLabel: "別会場のイベントを表示",
      action: { kind: "event", eventKey: "E2" },
      placeId: "other",
      eventKey: "E2",
      colorKey: "default",
    };
    const withPin = (markerKind: PinMarkerPlacement["markerKind"]) =>
      layout({
        mapLabels: [coveredLabel],
        markers: [
          otherBadge,
          { type: "pin", coordinates: { x: 0, y: 20 }, markerKind, placeId: "venue" },
        ],
        userUnitsPerPixel: 1,
      });

    // 目的地pinはラベルを残し、別会場のバッジは従来どおりそのラベルの直上へ退避する
    const destination = withPin("destination");
    expect(renderedLabelIds(destination)).toEqual(["text_covered"]);
    expect(destination.markers[0]?.coordinates.y).toBeLessThan(0);
    // 現在地・注目pinで隠れるラベルはバッジ配置より前に落ちるため、退避先の計算対象にならない
    for (const markerKind of ["current", "focus"] as const) {
      const result = withPin(markerKind);
      expect(renderedLabelIds(result)).toEqual([]);
      expect(result.markers[0]?.coordinates).toEqual({ x: 0, y: 0 });
    }
  });

  test("置換対象のイベントがなければ目的地pinの入力座標を維持する", () => {
    const pinLabel = label("text_pin", ["目的地"], { x: 25, y: 10 });
    const result = layout({
      mapLabels: [pinLabel],
      markers: [
        {
          type: "pin",
          coordinates: { x: 25, y: 30 },
          markerKind: "destination",
          placeId: "no-event",
          replacesEventMarker: { kind: "place", placeId: "no-event" },
        },
      ],
      userUnitsPerPixel: 1,
    });

    expect(result.markers[0]?.coordinates).toEqual({ x: 25, y: 30 });
    // 目的地pinの真上にあるラベルもそのまま残す(ピンが前面に重なる)
    expect(renderedLabelIds(result)).toEqual(["text_pin"]);
  });
});
