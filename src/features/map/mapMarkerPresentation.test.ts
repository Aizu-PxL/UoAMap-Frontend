import { describe, expect, test } from "bun:test";
import type { Event, Place } from "../../data/types";
import {
  createMapMarkerPresentation,
  type MarkerCoordinateTarget,
} from "./mapMarkerPresentation";

const places: Place[] = [
  { id: "room-a", floorId: "rq-1f", name: "研究棟 A", mapping: "svg", svgElementId: "room_a" },
  { id: "room-b", floorId: "rq-1f", name: "研究棟 B", mapping: "svg", svgElementId: "room_b" },
  { id: "room-c", floorId: "rq-1f", name: "研究棟 C", mapping: "svg", svgElementId: "room_c" },
  { id: "room-d", floorId: "rq-1f", name: "研究棟 D", mapping: "svg", svgElementId: "room_d" },
  { id: "room-rq2", floorId: "rq-2f", name: "研究棟2F", mapping: "svg", svgElementId: "room_rq2" },
  { id: "rq", floorId: "campus", name: "研究棟", mapping: "svg", svgElementId: "building_ResearchQuad" },
  { id: "outdoor", floorId: "campus", name: "屋外展示", mapping: "coordinates", coordinates: { x: 70, y: 80 } },
  { id: "no-coordinate", floorId: "campus", name: "座標なし", mapping: "coordinates", coordinates: { x: 0, y: 0 } },
];

function event(id: string, placeId: string): Event {
  return {
    id,
    title: `イベント${id}`,
    description: "説明",
    placeId,
    tags: [],
    timeSlots: [],
  };
}

const placeById = new Map(places.map((place) => [place.id, place]));
const floorSheetIds = new Map([
  ["campus", "campus"],
  ["rq-1f", "rq1f"],
  ["rq-2f", "rq2f"],
]);

function resolveCoordinates(target: MarkerCoordinateTarget) {
  if (target.kind === "svg-element") {
    return target.elementId === "building_ResearchQuad" ? { x: 10, y: 20 } : null;
  }
  const coordinatesByPlaceId: Record<string, { x: number; y: number }> = {
    "room-a": { x: 1, y: 2 },
    "room-b": { x: 3, y: 4 },
    "room-c": { x: 5, y: 6 },
    "room-d": { x: 9, y: 10 },
    "room-rq2": { x: 7, y: 8 },
    rq: { x: 10, y: 20 },
    outdoor: { x: 70, y: 80 },
  };
  return coordinatesByPlaceId[target.place.id] ?? null;
}

function createPresentation(options: {
  currentPlace?: Place | null;
  destinationPlace?: Place | null;
  events?: Event[];
  floorId?: string;
  focusPlace?: Place | null;
}) {
  return createMapMarkerPresentation({
    currentPlace: options.currentPlace ?? null,
    destinationPlace: options.destinationPlace ?? null,
    events: options.events ?? [],
    floorId: options.floorId ?? "rq-1f",
    focusPlace: options.focusPlace ?? null,
    resolveCoordinates,
    resolveFloorSheetId: (floorId) => floorSheetIds.get(floorId) ?? null,
    resolvePlace: (placeId) => placeById.get(placeId) ?? null,
  });
}

describe("createMapMarkerPresentation", () => {
  test("同一placeを先頭イベントで代表し入力place順を維持する", () => {
    const presentation = createPresentation({
      events: [event("E2", "room-b"), event("E1", "room-a"), event("E3", "room-a")],
    });

    expect(presentation).toEqual([
      {
        type: "event",
        coordinates: { x: 3, y: 4 },
        markerLabel: "研究棟 Bのイベントを表示: イベントE2",
        action: { kind: "event", eventId: "E2" },
        placeId: "room-b",
        eventId: "E2",
      },
      {
        type: "event",
        coordinates: { x: 1, y: 2 },
        markerLabel: "研究棟 Aのイベントを表示: イベントE1",
        action: { kind: "event", eventId: "E1" },
        placeId: "room-a",
        eventId: "E1",
      },
    ]);
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
        action: { kind: "event", eventId: "ED" },
        placeId: "room-d",
        eventId: "ED",
      },
      { type: "pin", coordinates: { x: 1, y: 2 }, markerKind: "current", placeId: "room-a" },
      { type: "pin", coordinates: { x: 3, y: 4 }, markerKind: "destination", placeId: "room-b" },
      { type: "pin", coordinates: { x: 5, y: 6 }, markerKind: "focus", placeId: "room-c" },
    ]);
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
      },
      {
        type: "event",
        coordinates: { x: 70, y: 80 },
        markerLabel: "屋外展示のイベント2件を表示: イベントO1",
        action: { kind: "event", eventId: "O1" },
        placeId: "outdoor",
        eventId: "O1",
        eventCount: 2,
      },
    ]);
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
});
