import { describe, expect, test } from "bun:test";
import type { Event, Place } from "../../data/types";
import {
  createMapMarkerPresentation,
  EVENT_MARKER_RADIUS,
  getEventMarkerInkBounds,
  getNextEventSelectionChangeTimestamp,
  layoutEventMarkers,
  projectPointToCampusBuilding,
  selectUpcomingEvent,
  type EventMarkerPlacement,
  type MapMarkerPlacement,
  type MarkerCoordinateTarget,
} from "./mapMarkerPresentation";
import type { MapLabel, MapLabelPlacement } from "./mapLabels";
import type { OverlayBounds } from "./mapOverlayGeometry";
import { getCenteredLabelBounds, overlayBoundsIntersect } from "./mapOverlayGeometry";

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

// selectVisibleMapLabels と同じ計算でラベル矩形を作る(fontSize=12px, padding=2px の画面固定)
function labelPlacement(
  source: MapLabel,
  userUnitsPerPixel: number,
  centeredLineOffsetsEm = [0],
): MapLabelPlacement {
  return {
    label: source,
    centeredLineOffsetsEm,
    bounds: getCenteredLabelBounds(
      source.center,
      source.lines,
      centeredLineOffsetsEm,
      12 * userUnitsPerPixel,
      0.95,
      2 * userUnitsPerPixel,
    ),
  };
}

function layoutAll(options: {
  markers: MapMarkerPlacement[];
  labels?: MapLabel[];
  labelPlacements?: MapLabelPlacement[];
  userUnitsPerPixel: number;
  buildingBounds?: OverlayBounds | null;
  placeBounds?: OverlayBounds | null;
}) {
  return layoutEventMarkers({
    markers: options.markers,
    labelPlacements: options.labelPlacements ?? [],
    mapLabels: options.labels ?? [],
    userUnitsPerPixel: options.userUnitsPerPixel,
    resolveElementBounds: () => options.buildingBounds ?? null,
    resolvePlaceBounds: () => options.placeBounds ?? null,
  });
}

function layout(options: Parameters<typeof layoutAll>[0]) {
  return layoutAll(options).markers;
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

const places: Place[] = [
  { id: "room-a", floorId: "rq-1f", name: "研究棟 A", mapping: "svg", svgElementId: "room_a" },
  { id: "room-b", floorId: "rq-1f", name: "研究棟 B", mapping: "svg", svgElementId: "room_b" },
  { id: "room-c", floorId: "rq-1f", name: "研究棟 C", mapping: "svg", svgElementId: "room_c" },
  { id: "room-d", floorId: "rq-1f", name: "研究棟 D", mapping: "svg", svgElementId: "room_d" },
  { id: "room-rq2", floorId: "rq-2f", name: "研究棟2F", mapping: "svg", svgElementId: "room_rq2" },
  { id: "rq_room_267", floorId: "rq-2f", name: "研究棟267", mapping: "svg", svgElementId: "room_267" },
  { id: "rq", floorId: "campus", name: "研究棟", mapping: "svg", svgElementId: "building_ResearchQuad" },
  { id: "outdoor", floorId: "campus", name: "屋外展示", mapping: "coordinates", coordinates: { x: 70, y: 80 } },
  { id: "no-coordinate", floorId: "campus", name: "座標なし", mapping: "coordinates", coordinates: { x: 0, y: 0 } },
  { id: "rq_room_161", floorId: "rq-1f", name: "研究棟1F 161", mapping: "svg", svgElementId: "room_161" },
  { id: "rq_room_325f", floorId: "rq-3f", name: "研究棟3F 325F", mapping: "svg", svgElementId: "room_325f" },
  { id: "lh_room_m8", floorId: "lh-1f", name: "講義棟1F M8", mapping: "svg", svgElementId: "room_m8" },
  { id: "lh_room_m3", floorId: "lh-2f", name: "講義棟2F M3", mapping: "svg", svgElementId: "room_m3" },
  { id: "sh_room_cafeteria", floorId: "sh-1f", name: "学生ホール 食堂", mapping: "svg", svgElementId: "room_cafeteria" },
  { id: "sh_entrance_east", floorId: "sh-2f", name: "学生ホール東口", mapping: "coordinates", coordinates: { x: 125, y: 3 } },
  { id: "ubic_room_3dtheater", floorId: "ubic-1f", name: "UBIC 3Dシアター", mapping: "svg", svgElementId: "room_3dtheater" },
  { id: "lictia_room_cswr", floorId: "lictia-1f", name: "LICTiA 箱庭チャンバー室", mapping: "coordinates", coordinates: { x: 32.5, y: 54.6 } },
  { id: "coordinate-without-route", floorId: "rq-1f", name: "Routeなし座標地点", mapping: "coordinates", coordinates: { x: 227, y: 325 } },
  { id: "unresolved-room", floorId: "rq-1f", name: "座標未解決", mapping: "svg", svgElementId: "unresolved_room" },
  { id: "unknown-floor-room", floorId: "unknown-1f", name: "未知フロア", mapping: "coordinates", coordinates: { x: 10, y: 10 } },
];

function event(id: string, placeId: string): Event {
  return {
    key: id,
    id,
    title: `イベント${id}`,
    description: "説明",
    placeId,
    tags: [],
    timeSlots: [],
  };
}

function idlessEvent(key: string, placeId: string): Event {
  return {
    key,
    title: `イベント${key}`,
    description: "説明",
    placeId,
    tags: [],
    timeSlots: [],
  };
}

function timedEvent(id: string, placeId: string, starts: string[]): Event {
  return {
    ...event(id, placeId),
    timeSlots: starts.map((start) => ({ start })),
  };
}

const placeById = new Map(places.map((place) => [place.id, place]));
const floorSheetIds = new Map([
  ["campus", "campus"],
  ["rq-1f", "rq1f"],
  ["rq-2f", "rq2f"],
  ["rq-3f", "rq3f"],
  ["sh-1f", "sh1f"],
  ["sh-2f", "sh2f"],
  ["lh-1f", "lh1f"],
  ["lh-2f", "lh2f"],
  ["ubic-1f", "ubic"],
  ["lictia-1f", "lictia"],
  ["unknown-1f", "unknown"],
]);

const buildingBoundsById: Record<string, OverlayBounds> = {
  building_ResearchQuad: { left: 100, top: 200, right: 300, bottom: 600 },
  building_StudentHall: { left: 10, top: 20, right: 90, bottom: 100 },
  building_LecHall: { left: 300, top: 100, right: 500, bottom: 250 },
  building_UBIC: { left: 500, top: 50, right: 600, bottom: 100 },
  building_LICTiA: { left: 600, top: 50, right: 650, bottom: 100 },
};

function resolveCoordinates(target: MarkerCoordinateTarget) {
  if (target.kind === "route-node") {
    return { x: target.node.x, y: target.node.y };
  }
  if (target.kind === "svg-element") {
    return target.elementId === "building_ResearchQuad" ? { x: 10, y: 20 } : null;
  }
  if (
    target.place.mapping === "coordinates" &&
    target.place.id !== "no-coordinate"
  ) {
    return { ...target.place.coordinates };
  }
  const coordinatesByPlaceId: Record<string, { x: number; y: number }> = {
    "room-a": { x: 1, y: 2 },
    "room-b": { x: 3, y: 4 },
    "room-c": { x: 5, y: 6 },
    "room-d": { x: 9, y: 10 },
    "room-rq2": { x: 7, y: 8 },
    rq: { x: 10, y: 20 },
    outdoor: { x: 70, y: 80 },
    // ルートノード(35, 247)を持つPlace。ピン種別ごとの座標の出所を区別するために別値にする
    rq_room_161: { x: 900, y: 901 },
  };
  return coordinatesByPlaceId[target.place.id] ?? null;
}

function createPresentation(options: {
  currentPlace?: Place | null;
  destinationPlace?: Place | null;
  events?: Event[];
  floorId?: string;
  focusPlace?: Place | null;
  now?: Date;
  resolveElementBounds?: (elementId: string) => OverlayBounds | null;
}) {
  return createMapMarkerPresentation({
    currentPlace: options.currentPlace ?? null,
    destinationPlace: options.destinationPlace ?? null,
    events: options.events ?? [],
    floorId: options.floorId ?? "rq-1f",
    focusPlace: options.focusPlace ?? null,
    now: options.now,
    resolveCoordinates,
    resolveElementBounds:
      options.resolveElementBounds ??
      ((elementId) => buildingBoundsById[elementId] ?? null),
    resolveFloorSheetId: (floorId) => floorSheetIds.get(floorId) ?? null,
    resolvePlace: (placeId) => placeById.get(placeId) ?? null,
  });
}

function firstEventColor(options: Parameters<typeof createPresentation>[0]) {
  const marker = createPresentation(options)[0];
  return marker?.type === "event" ? marker.colorKey : null;
}

describe("createMapMarkerPresentation", () => {
  test("屋内座標をキャンパス建物bboxの同じ相対位置へ写像して範囲外をクランプする", () => {
    expect(
      projectPointToCampusBuilding(
        { x: 25, y: 50 },
        { x: 0, y: 0, width: 100, height: 100 },
        { left: 200, top: 300, right: 600, bottom: 500 },
      ),
    ).toEqual({ x: 300, y: 400 });
    expect(
      projectPointToCampusBuilding(
        { x: -10, y: 120 },
        { x: 0, y: 0, width: 100, height: 100 },
        { left: 200, top: 300, right: 600, bottom: 500 },
      ),
    ).toEqual({ x: 200, y: 500 });
    expect(
      projectPointToCampusBuilding(
        { x: 1, y: 1 },
        { x: 0, y: 0, width: 0, height: 100 },
        { left: 200, top: 300, right: 600, bottom: 500 },
      ),
    ).toEqual(null);
  });

  test("9屋内フロアの実Route地点を対応するキャンパス建物bbox内へ投影する", () => {
    const cases = [
      ["rq_room_161", buildingBoundsById.building_ResearchQuad],
      ["rq_room_267", buildingBoundsById.building_ResearchQuad],
      ["rq_room_325f", buildingBoundsById.building_ResearchQuad],
      ["lh_room_m8", buildingBoundsById.building_LecHall],
      ["lh_room_m3", buildingBoundsById.building_LecHall],
      ["sh_room_cafeteria", buildingBoundsById.building_StudentHall],
      ["sh_entrance_east", buildingBoundsById.building_StudentHall],
      ["ubic_room_3dtheater", buildingBoundsById.building_UBIC],
      ["lictia_room_cswr", buildingBoundsById.building_LICTiA],
    ] as const;

    for (const [placeId, buildingBounds] of cases) {
      const presentation = createPresentation({
        currentPlace: placeById.get(placeId),
        floorId: "campus",
      });
      const marker = presentation[0];
      expect(presentation.length).toEqual(1);
      expect(marker?.type).toEqual("pin");
      if (marker?.type !== "pin") {
        continue;
      }
      expect(marker.markerKind).toEqual("current");
      expect(marker.placeId).toEqual(placeId);
      expect(marker.coordinates.x >= buildingBounds.left).toEqual(true);
      expect(marker.coordinates.x <= buildingBounds.right).toEqual(true);
      expect(marker.coordinates.y >= buildingBounds.top).toEqual(true);
      expect(marker.coordinates.y <= buildingBounds.bottom).toEqual(true);
    }
  });

  test("Routeノードまたは投影設定を解決できない現在地を省略する", () => {
    expect(
      createPresentation({
        currentPlace: placeById.get("coordinate-without-route"),
        floorId: "campus",
      }),
    ).toEqual([]);
    expect(
      createPresentation({
        currentPlace: placeById.get("unresolved-room"),
        floorId: "campus",
      }),
    ).toEqual([]);
    expect(
      createPresentation({
        currentPlace: placeById.get("unknown-floor-room"),
        floorId: "campus",
      }),
    ).toEqual([]);
    expect(
      createPresentation({
        destinationPlace: placeById.get("rq_room_161"),
        focusPlace: placeById.get("sh_room_cafeteria"),
        floorId: "campus",
      }),
    ).toEqual([]);
  });

  test("投影した現在地を優先して同じ建物のイベント集約バッジを省略する", () => {
    const presentation = createPresentation({
      currentPlace: placeById.get("rq_room_161"),
      events: [event("R1", "room-a")],
      floorId: "campus",
    });

    expect(presentation.filter((marker) => marker.type === "event")).toEqual([]);
    expect(presentation.length).toEqual(1);
    expect(presentation[0]?.type).toEqual("pin");
    if (presentation[0]?.type === "pin") {
      expect(presentation[0].markerKind).toEqual("current");
      expect(presentation[0].placeId).toEqual("rq_room_161");
    }
  });

  test("建物bboxを解決できない場合は屋内現在地を誤配置しない", () => {
    expect(
      createPresentation({
        currentPlace: placeById.get("rq_room_161"),
        floorId: "campus",
        resolveElementBounds: () => null,
      }),
    ).toEqual([]);
  });

  test("正式IDなしイベントも内部keyでmarker actionを作る", () => {
    expect(
      createPresentation({
        events: [idlessEvent("service-lunch", "room-a")],
        floorId: "rq-1f",
      }),
    ).toEqual([
      {
        type: "event",
        coordinates: { x: 1, y: 2 },
        markerLabel: "研究棟 Aのイベントを表示: イベントservice-lunch",
        action: { kind: "event", eventKey: "service-lunch" },
        placeId: "room-a",
        eventKey: "service-lunch",
        eventId: undefined,
        colorKey: "default",
      },
    ]);
  });

  test("時刻情報がない同一placeは先頭イベントで代表し入力place順を維持する", () => {
    const presentation = createPresentation({
      events: [event("E2", "room-b"), event("E1", "room-a"), event("E3", "room-a")],
    });

    expect(presentation).toEqual([
      {
        type: "event",
        coordinates: { x: 3, y: 4 },
        markerLabel: "研究棟 Bのイベントを表示: イベントE2",
        action: { kind: "event", eventKey: "E2" },
        placeId: "room-b",
        eventKey: "E2",
        eventId: "E2",
        colorKey: "explanation",
      },
      {
        type: "event",
        coordinates: { x: 1, y: 2 },
        markerLabel: "研究棟 Aのイベントを表示: イベントE1",
        action: { kind: "event", eventKey: "E1" },
        placeId: "room-a",
        eventKey: "E1",
        eventId: "E1",
        colorKey: "explanation",
      },
    ]);
  });

  test("同一placeは現在時刻以降で最も早い回を入力順に関係なく代表にする", () => {
    const presentation = createPresentation({
      events: [
        timedEvent("E3", "room-a", ["2026-08-08T13:00:00+09:00"]),
        timedEvent("E1", "room-a", ["2026-08-08T09:30:00+09:00"]),
        timedEvent("E2", "room-a", ["2026-08-08T11:00:00+09:00"]),
      ],
      now: new Date("2026-08-08T10:00:00+09:00"),
    });

    expect(presentation[0]).toMatchObject({
      markerLabel: "研究棟 Aのイベントを表示: イベントE2",
      action: { kind: "event", eventKey: "E2" },
      eventKey: "E2",
      eventId: "E2",
    });
  });

  test("同じイベントの後続スロットも未実施候補として扱う", () => {
    const first = timedEvent("E1", "room-a", [
      "2026-08-08T09:30:00+09:00",
      "2026-08-08T13:00:00+09:00",
    ]);
    const second = timedEvent("E2", "room-a", [
      "2026-08-08T12:00:00+09:00",
    ]);

    expect(
      selectUpcomingEvent(
        [first, second],
        new Date("2026-08-08T10:00:00+09:00"),
      )?.key,
    ).toEqual("E2");
    expect(
      selectUpcomingEvent(
        [first, second],
        new Date("2026-08-08T12:30:00+09:00"),
      )?.key,
    ).toEqual("E1");
  });

  test("全回の開始後は入力順の先頭へフォールバックする", () => {
    const first = timedEvent("E2", "room-a", [
      "2026-08-08T11:00:00+09:00",
    ]);
    const second = timedEvent("E1", "room-a", [
      "2026-08-08T09:30:00+09:00",
    ]);

    expect(
      selectUpcomingEvent(
        [first, second],
        new Date("2026-08-08T14:00:00+09:00"),
      )?.key,
    ).toEqual("E2");
  });

  test("次の開始時刻直後をバッジ再生成時刻として返す", () => {
    const events = [
      timedEvent("E2", "room-a", ["2026-08-08T13:00:00+09:00"]),
      timedEvent("E1", "room-a", ["2026-08-08T11:00:00+09:00"]),
    ];

    expect(
      getNextEventSelectionChangeTimestamp(
        events,
        new Date("2026-08-08T10:00:00+09:00"),
      ),
    ).toEqual(new Date("2026-08-08T11:00:00+09:00").getTime() + 1);
    expect(
      getNextEventSelectionChangeTimestamp(
        events,
        new Date("2026-08-08T14:00:00+09:00"),
      ),
    ).toEqual(null);
  });

  test("eventを先に描画しpinをcurrent・destination・focus順に前面へ置く", () => {
    const presentation = createPresentation({
      currentPlace: placeById.get("room-a"),
      destinationPlace: placeById.get("room-b"),
      focusPlace: placeById.get("room-c"),
      events: [event("EA", "room-a"), event("ED", "room-d")],
    });

    expect(presentation).toEqual([
      {
        type: "event",
        coordinates: { x: 9, y: 10 },
        markerLabel: "研究棟 Dのイベントを表示: イベントED",
        action: { kind: "event", eventKey: "ED" },
        placeId: "room-d",
        eventKey: "ED",
        eventId: "ED",
        colorKey: "explanation",
      },
      { type: "pin", coordinates: { x: 1, y: 2 }, markerKind: "current", placeId: "room-a" },
      { type: "pin", coordinates: { x: 3, y: 4 }, markerKind: "destination", placeId: "room-b" },
      { type: "pin", coordinates: { x: 5, y: 6 }, markerKind: "focus", placeId: "room-c" },
    ]);
  });

  test("目的地と重なる個別イベントを配置用に残し置換対象をpinへ保持する", () => {
    expect(
      createPresentation({
        destinationPlace: placeById.get("room-a"),
        events: [event("EA", "room-a")],
      }),
    ).toEqual([
      {
        type: "event",
        coordinates: { x: 1, y: 2 },
        markerLabel: "研究棟 Aのイベントを表示: イベントEA",
        action: { kind: "event", eventKey: "EA" },
        placeId: "room-a",
        eventKey: "EA",
        eventId: "EA",
        colorKey: "explanation",
      },
      {
        type: "pin",
        coordinates: { x: 1, y: 2 },
        markerKind: "destination",
        placeId: "room-a",
        replacesEventMarker: { kind: "place", placeId: "room-a" },
      },
    ]);
  });

  test("現在地または注目ピンが同時に重なる場合はイベントを従来どおり抑止する", () => {
    const room = placeById.get("room-a");
    const presentation = createPresentation({
      currentPlace: room,
      destinationPlace: room,
      focusPlace: room,
      events: [event("EA", "room-a")],
    });

    expect(presentation.filter((marker) => marker.type === "event")).toEqual([]);
    expect(presentation.map((marker) => marker.coordinates)).toEqual([
      { x: 1, y: 2 },
      { x: 1, y: 2 },
      { x: 1, y: 2 },
    ]);
  });

  test("別フロアでは表示中フロアのcurrentまたはdestination pinだけを描画する", () => {
    const currentPlace = placeById.get("room-a");
    const destinationPlace = placeById.get("room-rq2");

    expect(
      createPresentation({
        currentPlace,
        destinationPlace,
        floorId: "rq-1f",
      }).filter((marker) => marker.type === "pin"),
    ).toEqual([
      { type: "pin", coordinates: { x: 1, y: 2 }, markerKind: "current", placeId: "room-a" },
    ]);
    expect(
      createPresentation({
        currentPlace,
        destinationPlace,
        floorId: "rq-2f",
      }).filter((marker) => marker.type === "pin"),
    ).toEqual([
      { type: "pin", coordinates: { x: 7, y: 8 }, markerKind: "destination", placeId: "room-rq2" },
    ]);
  });

  test("イベントバッジ中心を同一place・floorのルートノード座標に固定する", () => {
    expect(
      createPresentation({
        events: [event("R267", "rq_room_267")],
        floorId: "rq-2f",
      }),
    ).toEqual([
      {
        type: "event",
        coordinates: { x: 135, y: 393 },
        markerLabel: "研究棟267のイベントを表示: イベントR267",
        action: { kind: "event", eventKey: "R267" },
        placeId: "rq_room_267",
        eventKey: "R267",
        eventId: "R267",
        colorKey: "study",
      },
    ]);
  });

  test("目的地pinだけをルート終端へ固定し現在地・注目pinはPlace座標のままにする", () => {
    const place = placeById.get("rq_room_161");

    expect(
      createPresentation({
        currentPlace: place,
        destinationPlace: place,
        focusPlace: place,
        floorId: "rq-1f",
      }),
    ).toEqual([
      {
        type: "pin",
        coordinates: { x: 900, y: 901 },
        markerKind: "current",
        placeId: "rq_room_161",
      },
      {
        type: "pin",
        coordinates: { x: 35, y: 247 },
        markerKind: "destination",
        placeId: "rq_room_161",
      },
      {
        type: "pin",
        coordinates: { x: 900, y: 901 },
        markerKind: "focus",
        placeId: "rq_room_161",
      },
    ]);
  });

  test("イベントバッジを置換する目的地pinもルート終端へ固定する", () => {
    const presentation = createPresentation({
      destinationPlace: placeById.get("rq_room_161"),
      events: [event("R1", "rq_room_161")],
      floorId: "rq-1f",
    });

    expect(presentation).toEqual([
      {
        type: "event",
        coordinates: { x: 35, y: 247 },
        markerLabel: "研究棟1F 161のイベントを表示: イベントR1",
        action: { kind: "event", eventKey: "R1" },
        placeId: "rq_room_161",
        eventKey: "R1",
        eventId: "R1",
        colorKey: "study",
      },
      {
        type: "pin",
        coordinates: { x: 35, y: 247 },
        markerKind: "destination",
        placeId: "rq_room_161",
        replacesEventMarker: { kind: "place", placeId: "rq_room_161" },
      },
    ]);
  });

  test("対応するルートノードがない目的地pinはPlace座標へフォールバックする", () => {
    expect(
      createPresentation({
        destinationPlace: placeById.get("coordinate-without-route"),
        floorId: "rq-1f",
      }),
    ).toEqual([
      {
        type: "pin",
        coordinates: { x: 227, y: 325 },
        markerKind: "destination",
        placeId: "coordinate-without-route",
      },
    ]);
  });

  test("対応するルートノードがないイベントPlaceはPlace座標へフォールバックする", () => {
    expect(
      createPresentation({
        events: [event("E1", "room-a")],
        floorId: "rq-1f",
      })[0]?.coordinates,
    ).toEqual({ x: 1, y: 2 });
  });

  test("キャンパス集約バッジを対応する建物名ラベルの直上へ配置する", () => {
    const studentHall = label("text_StudentHall", ["学生ホール"], { x: 100, y: 200 });
    const marker = layout({
      markers: [studentHallBadge],
      labels: [label("text_Cafeteria", ["食堂"], { x: 300, y: 400 }), studentHall],
      userUnitsPerPixel: 2,
      buildingBounds: { left: 0, top: 0, right: 300, bottom: 400 },
    })[0];

    // 1行ラベル: 半高6px + クリアランス18px = 24px上 → y = 200 - 24*2
    expect(marker?.coordinates).toEqual({ x: 100, y: 152 });
    if (!marker || marker.type !== "event") {
      throw new Error("集約バッジが生成されませんでした");
    }
    expect(
      overlayBoundsIntersect(
        getEventMarkerInkBounds(marker, 2, 2),
        labelPlacement(studentHall, 2).bounds,
      ),
    ).toEqual(false);
  });

  test("2行の建物名ラベルでは行数ぶんバッジを持ち上げ文字と交差しない", () => {
    const studentHall = label(
      "text_StudentHall",
      ["学生", "ホール"],
      { x: 100, y: 200 },
      [0, 1.2],
    );
    const marker = layout({
      markers: [studentHallBadge],
      labels: [studentHall],
      userUnitsPerPixel: 2,
      buildingBounds: { left: 0, top: 0, right: 300, bottom: 400 },
    })[0];

    // 2行ラベル: 半高(0.6+0.5)*12=13.2px + クリアランス18px = 31.2px上
    expect(marker?.coordinates).toEqual({ x: 100, y: 200 - 31.2 * 2 });
    if (!marker || marker.type !== "event") {
      throw new Error("集約バッジが生成されませんでした");
    }
    expect(
      overlayBoundsIntersect(
        getEventMarkerInkBounds(marker, 2, 2),
        labelPlacement(studentHall, 2, [-0.6, 0.6]).bounds,
      ),
    ).toEqual(false);
  });

  test("引きで建物からはみ出す集約バッジは外形bbox内へ押し戻す", () => {
    const studentHall = label("text_StudentHall", ["学生ホール"], { x: 100, y: 200 });
    const buildingBounds = { left: 80, top: 140, right: 200, bottom: 260 };
    const marker = layout({
      markers: [studentHallBadge],
      labels: [studentHall],
      userUnitsPerPixel: 2,
      buildingBounds,
    })[0];

    if (!marker || marker.type !== "event") {
      throw new Error("集約バッジが生成されませんでした");
    }
    // ラベル直上のy=152から押し戻され、インク範囲が建物の外形bboxに完全に収まっていること
    expect(marker.coordinates.y).toBeGreaterThan(152);
    const ink = getEventMarkerInkBounds(marker, 2);
    expect(ink.left).toBeGreaterThanOrEqual(buildingBounds.left);
    expect(ink.top).toBeGreaterThanOrEqual(buildingBounds.top);
    expect(ink.right).toBeLessThanOrEqual(buildingBounds.right);
    expect(ink.bottom).toBeLessThanOrEqual(buildingBounds.bottom);
  });

  const individualMarker: EventMarkerPlacement = {
    type: "event",
    coordinates: { x: 70, y: 80 },
    markerLabel: "屋外展示のイベントを表示: イベントO1",
    action: { kind: "event", eventKey: "O1" },
    placeId: "outdoor",
    eventKey: "O1",
    colorKey: "default",
  };

  test("個別バッジは重なるラベルの直上へ退避する", () => {
    const outdoor = label("text_outdoor", ["屋外展示"], { x: 70, y: 80 });
    const placement = labelPlacement(outdoor, 2);
    const marker = layout({
      markers: [individualMarker],
      labels: [outdoor],
      labelPlacements: [placement],
      userUnitsPerPixel: 2,
    })[0];

    if (!marker || marker.type !== "event") {
      throw new Error("個別バッジが生成されませんでした");
    }
    expect(marker.coordinates.x).toEqual(70);
    expect(marker.coordinates.y).toBeLessThan(80);
    expect(
      overlayBoundsIntersect(getEventMarkerInkBounds(marker, 2), placement.bounds),
    ).toEqual(false);
  });

  test("重なるラベルがない個別バッジはルートノード座標のまま動かない", () => {
    const faraway = label("text_faraway", ["別の場所"], { x: 700, y: 800 });
    expect(
      layout({
        markers: [individualMarker],
        labels: [faraway],
        labelPlacements: [labelPlacement(faraway, 2)],
        userUnitsPerPixel: 2,
      })[0]?.coordinates,
    ).toEqual({ x: 70, y: 80 });
  });

  test("フロアシートの会場バッジは同位置の部屋名ラベルを覆わない", () => {
    // 実測: rq_room_267 のルートノード(135, 393)と text_m2_267 のbbox中心はほぼ同一点
    const userUnitsPerPixel = 1.3;
    const roomLabel = label("text_m2_267", ["267"], { x: 138, y: 393 });
    const placement = labelPlacement(roomLabel, userUnitsPerPixel);
    const badge = createPresentation({
      floorId: "rq-2f",
      events: [event("R1", "rq_room_267")],
    })[0];

    expect(badge?.coordinates).toEqual({ x: 135, y: 393 });
    const marker = layout({
      markers: badge ? [badge] : [],
      labels: [roomLabel],
      labelPlacements: [placement],
      userUnitsPerPixel,
    })[0];

    if (!marker || marker.type !== "event") {
      throw new Error("会場バッジが生成されませんでした");
    }
    expect(
      overlayBoundsIntersect(
        getEventMarkerInkBounds(marker, userUnitsPerPixel),
        placement.bounds,
      ),
    ).toEqual(false);
  });

  test("部屋の外形が取れる会場バッジは部屋bbox内に収め、部屋名も避ける", () => {
    const roomBounds = { left: 0, top: 0, right: 100, bottom: 80 };
    const roomLabel = label("text_room", ["267"], { x: 50, y: 40 });
    const placement = labelPlacement(roomLabel, 1);
    const marker = layout({
      // ルートノードは部屋名(x=50)から少しずれた位置にある
      markers: [{ ...individualMarker, placeId: "room", coordinates: { x: 42, y: 40 } }],
      labels: [roomLabel],
      labelPlacements: [placement],
      userUnitsPerPixel: 1,
      placeBounds: roomBounds,
    })[0];

    if (!marker || marker.type !== "event") {
      throw new Error("会場バッジが生成されませんでした");
    }
    // xはルートノードのまま。部屋名のxへ寄せない
    expect(marker.coordinates.x).toEqual(42);
    const ink = getEventMarkerInkBounds(marker, 1);
    expect(ink.left).toBeGreaterThanOrEqual(roomBounds.left);
    expect(ink.top).toBeGreaterThanOrEqual(roomBounds.top);
    expect(ink.right).toBeLessThanOrEqual(roomBounds.right);
    expect(ink.bottom).toBeLessThanOrEqual(roomBounds.bottom);
    expect(overlayBoundsIntersect(ink, placement.bounds)).toEqual(false);
  });

  test("部屋の幅が足りない場合だけxを部屋bbox内へクランプする", () => {
    // 幅26の部屋にインク幅22のバッジ。ノードのx=4では左へはみ出すのでクランプされる
    const roomBounds = { left: 0, top: 0, right: 26, bottom: 80 };
    const roomLabel = label("text_room", ["127"], { x: 13, y: 40 });
    const marker = layout({
      markers: [{ ...individualMarker, placeId: "room", coordinates: { x: 4, y: 40 } }],
      labels: [roomLabel],
      labelPlacements: [labelPlacement(roomLabel, 1)],
      userUnitsPerPixel: 1,
      placeBounds: roomBounds,
    })[0];

    const ink = marker?.type === "event" ? getEventMarkerInkBounds(marker, 1) : null;
    expect(ink?.left).toBeGreaterThanOrEqual(roomBounds.left);
    expect(ink?.right).toBeLessThanOrEqual(roomBounds.right);
  });

  test("バッジと部屋名が両立しない狭い部屋でもアンカー点は部屋bbox内に残す", () => {
    // 高さ33の部屋にバッジ22と文字18は入らない。はみ出しはバッジ半径11までに抑える
    const roomBounds = { left: 0, top: 0, right: 100, bottom: 33 };
    const roomLabel = label("text_room", ["144"], { x: 50, y: 16.5 });
    const marker = layout({
      markers: [{ ...individualMarker, placeId: "room" }],
      labels: [roomLabel],
      labelPlacements: [labelPlacement(roomLabel, 1)],
      userUnitsPerPixel: 1,
      placeBounds: roomBounds,
    })[0];

    if (!marker || marker.type !== "event") {
      throw new Error("会場バッジが生成されませんでした");
    }
    expect(marker.coordinates.y).toBeGreaterThanOrEqual(roomBounds.top);
    expect(marker.coordinates.y).toBeLessThanOrEqual(roomBounds.bottom);
    const ink = getEventMarkerInkBounds(marker, 1);
    expect(roomBounds.top - ink.top).toBeLessThanOrEqual(EVENT_MARKER_RADIUS);
    expect(ink.bottom - roomBounds.bottom).toBeLessThanOrEqual(EVENT_MARKER_RADIUS);
  });

  test("部屋の外形が取れない会場バッジは従来どおりラベル直上へ退避する", () => {
    const roomLabel = label("text_room", ["267"], { x: 70, y: 80 });
    const placement = labelPlacement(roomLabel, 1);
    const marker = layout({
      markers: [{ ...individualMarker, placeId: "coordinates-only" }],
      labels: [roomLabel],
      labelPlacements: [placement],
      userUnitsPerPixel: 1,
      placeBounds: null,
    })[0];

    if (!marker || marker.type !== "event") {
      throw new Error("会場バッジが生成されませんでした");
    }
    // 退避はy方向のみ。ラベル中心x(70)ではなくルートノードのxを維持する
    expect(marker.coordinates.x).toEqual(70);
    expect(marker.coordinates.y).toBeLessThan(80);
    expect(
      overlayBoundsIntersect(getEventMarkerInkBounds(marker, 1), placement.bounds),
    ).toEqual(false);
  });

  test("アンカーに使ったラベルIDを返す", () => {
    const roomLabel = label("text_room", ["267"], { x: 50, y: 40 });
    expect([
      ...layoutAll({
        markers: [{ ...individualMarker, placeId: "room" }],
        labels: [roomLabel],
        labelPlacements: [labelPlacement(roomLabel, 1)],
        userUnitsPerPixel: 1,
        placeBounds: { left: 0, top: 0, right: 100, bottom: 80 },
      }).anchoredLabelIds,
    ]).toEqual(["text_room"]);
  });

  test("キャンパスでは建物別件数と屋外place件数を集約しactionを分ける", () => {
    const presentation = createPresentation({
      floorId: "campus",
      events: [
        event("R1", "room-a"),
        event("R2", "room-rq2"),
        event("R3", "room-b"),
        event("O1", "outdoor"),
        event("O2", "outdoor"),
      ],
    });

    expect(presentation).toEqual([
      {
        type: "event",
        coordinates: { x: 10, y: 20 },
        markerLabel: "研究棟、イベント3件。建物を表示",
        action: { kind: "floor", floorId: "rq-1f" },
        buildingId: "building_ResearchQuad",
        eventCount: 3,
        colorKey: "study",
      },
      {
        type: "event",
        coordinates: { x: 70, y: 80 },
        markerLabel: "屋外展示のイベント2件を表示: イベントO1",
        action: { kind: "event", eventKey: "O1" },
        placeId: "outdoor",
        eventKey: "O1",
        eventId: "O1",
        eventCount: 2,
        colorKey: "default",
      },
    ]);
  });

  test("同一地点と建物集約は同色だけを維持し混色をdefaultへ戻す", () => {
    expect(
      firstEventColor({
        events: [event("A1", "room-a"), event("L1", "room-a")],
      }),
    ).toEqual("explanation");
    expect(
      firstEventColor({
        events: [event("A1", "room-a"), event("M1", "room-a")],
      }),
    ).toEqual("default");
    expect(
      firstEventColor({
        floorId: "campus",
        events: [event("R1", "room-a"), event("M1", "room-rq2")],
      }),
    ).toEqual("default");
  });

  test("キャンパス建物pinを優先し未知placeと座標なしを無視する", () => {
    const presentation = createPresentation({
      currentPlace: placeById.get("rq"),
      floorId: "campus",
      events: [
        event("R1", "room-a"),
        event("MISSING", "missing"),
        event("NO_COORDINATE", "no-coordinate"),
      ],
    });

    expect(presentation).toEqual([
      { type: "pin", coordinates: { x: 10, y: 20 }, markerKind: "current", placeId: "rq" },
    ]);
  });

  test("キャンパス建物の目的地pinへ集約バッジの置換対象を保持する", () => {
    expect(
      createPresentation({
        destinationPlace: placeById.get("rq"),
        floorId: "campus",
        events: [event("R1", "room-a")],
      }),
    ).toEqual([
      {
        type: "event",
        coordinates: { x: 10, y: 20 },
        markerLabel: "研究棟、イベント1件。建物を表示",
        action: { kind: "floor", floorId: "rq-1f" },
        buildingId: "building_ResearchQuad",
        eventCount: 1,
        colorKey: "study",
      },
      {
        type: "pin",
        coordinates: { x: 10, y: 20 },
        markerKind: "destination",
        placeId: "rq",
        replacesEventMarker: {
          kind: "building",
          buildingId: "building_ResearchQuad",
        },
      },
    ]);
  });
});
