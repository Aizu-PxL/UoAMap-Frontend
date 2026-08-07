import { describe, expect, test } from "bun:test";
import type { RouteEdge, RouteNode } from "../../data/types";
import { findShortestRouteBetweenPlaces } from "./findShortestRoute";
import { routeGraph } from "./routeGraph";
import { createRoutePresentation } from "./routePresentation";

const nodes: RouteNode[] = [
  { id: "f1:c", floorId: "f1", x: -10, y: 0, kind: "corridor" },
  { id: "f1:a", floorId: "f1", x: 0, y: 0, kind: "corridor" },
  { id: "f1:b", floorId: "f1", x: 10, y: 0, kind: "stairs" },
  { id: "f2:b", floorId: "f2", x: 10, y: 0, kind: "stairs" },
  { id: "f3:b", floorId: "f3", x: 10, y: 0, kind: "stairs" },
  { id: "campus:door", floorId: "campus", x: 20, y: 0, kind: "entrance" },
  { id: "f1:door", floorId: "f1", x: 20, y: 0, kind: "entrance" },
];

const walkEdge: RouteEdge = {
  id: "f1:walk",
  kind: "walk",
  floorId: "f1",
  nodeA: "f1:a",
  nodeB: "f1:b",
  distance: 10,
  pathD: "M 0 0 L 10 0",
};

const secondWalkEdge: RouteEdge = {
  ...walkEdge,
  id: "f1:walk-second",
  nodeA: "f1:c",
  nodeB: "f1:a",
  pathD: "M -10 0 L 0 0",
};

const transferEdge: RouteEdge = {
  id: "transfer:stairs:f1:f2",
  kind: "transfer",
  nodeA: "f1:b",
  nodeB: "f2:b",
  distance: 60,
};

const secondTransferEdge: RouteEdge = {
  id: "transfer:stairs:f2:f3",
  kind: "transfer",
  nodeA: "f2:b",
  nodeB: "f3:b",
  distance: 60,
};

const entranceTransferEdge: RouteEdge = {
  id: "transfer:entrance:door:campus:f1",
  kind: "transfer",
  nodeA: "campus:door",
  nodeB: "f1:door",
  distance: 0,
};

describe("createRoutePresentation", () => {
  test("空経路は空の表示モデルになる", () => {
    const presentation = createRoutePresentation([], nodes, null);

    expect([...presentation.floorIds]).toEqual([]);
    expect([...presentation.floorsById]).toEqual([]);
  });

  test("同一フロアの歩行経路にはtransferマーカーを生成しない", () => {
    const presentation = createRoutePresentation([walkEdge], nodes, "f1:a");

    expect([...presentation.floorIds]).toEqual(["f1"]);
    expect(presentation.floorsById.get("f1")?.transferMarkers).toEqual([]);
  });

  test("walkと階段transferをフロア別に分配し出発側だけに上りを付ける", () => {
    const presentation = createRoutePresentation(
      [secondWalkEdge, walkEdge, transferEdge],
      nodes,
      "f1:c",
    );

    expect([...presentation.floorIds]).toEqual(["f1", "f2"]);
    expect(presentation.floorsById.get("f1")?.walkEdges).toEqual([
      secondWalkEdge,
      walkEdge,
    ]);
    expect(presentation.floorsById.get("f1")?.transferMarkers).toEqual([
      {
        id: "f1:b",
        floorId: "f1",
        x: 10,
        y: 0,
        kind: "stairs",
        direction: "up",
      },
    ]);
    expect(presentation.floorsById.get("f2")?.walkEdges).toEqual([]);
    expect(presentation.floorsById.get("f2")?.transferMarkers).toEqual([]);
  });

  test("3フロアの往復で中間階を次の出発側として上り／下りを付ける", () => {
    const upward = createRoutePresentation(
      [walkEdge, transferEdge, secondTransferEdge],
      nodes,
      "f1:a",
    );
    const downward = createRoutePresentation(
      [secondTransferEdge, transferEdge, walkEdge],
      nodes,
      "f3:b",
    );

    expect(upward.floorsById.get("f1")?.transferMarkers).toEqual([
      {
        id: "f1:b",
        floorId: "f1",
        x: 10,
        y: 0,
        kind: "stairs",
        direction: "up",
      },
    ]);
    expect(upward.floorsById.get("f2")?.transferMarkers).toEqual([
      {
        id: "f2:b",
        floorId: "f2",
        x: 10,
        y: 0,
        kind: "stairs",
        direction: "up",
      },
    ]);
    expect(upward.floorsById.get("f3")?.transferMarkers).toEqual([]);

    expect(downward.floorsById.get("f3")?.transferMarkers).toEqual([
      {
        id: "f3:b",
        floorId: "f3",
        x: 10,
        y: 0,
        kind: "stairs",
        direction: "down",
      },
    ]);
    expect(downward.floorsById.get("f2")?.transferMarkers).toEqual([
      {
        id: "f2:b",
        floorId: "f2",
        x: 10,
        y: 0,
        kind: "stairs",
        direction: "down",
      },
    ]);
    expect(downward.floorsById.get("f1")?.transferMarkers).toEqual([]);
  });

  test("入口transferは従来どおり両フロアへ円形マーカーを残す", () => {
    const presentation = createRoutePresentation(
      [entranceTransferEdge],
      nodes,
      "campus:door",
    );

    expect(presentation.floorsById.get("campus")?.transferMarkers).toEqual([
      { id: "campus:door", floorId: "campus", x: 20, y: 0, kind: "entrance" },
    ]);
    expect(presentation.floorsById.get("f1")?.transferMarkers).toEqual([
      { id: "f1:door", floorId: "f1", x: 20, y: 0, kind: "entrance" },
    ]);
  });

  test("未知endpointと不連続な経路から階段方向を生成しない", () => {
    const unknownTransfer: RouteEdge = {
      id: "transfer:unknown",
      kind: "transfer",
      nodeA: "missing",
      nodeB: "f2:b",
      distance: 0,
    };
    const disconnectedTransfer: RouteEdge = {
      ...secondTransferEdge,
      id: "transfer:disconnected",
    };

    const presentation = createRoutePresentation(
      [walkEdge, unknownTransfer, disconnectedTransfer],
      nodes,
      "f1:a",
    );

    expect(presentation.floorsById.get("f1")?.transferMarkers).toEqual([]);
    expect(presentation.floorsById.get("f2")?.transferMarkers).toEqual([]);
    expect(presentation.floorsById.get("f3")?.transferMarkers).toEqual([]);
    expect(presentation.floorIds.has("missing")).toEqual(false);
  });

  test("実グラフの正逆経路でtransfer-onlyフロアとcampusを維持する", () => {
    const forward = findShortestRouteBetweenPlaces(
      routeGraph,
      "rq_room_325f",
      "main_auditorium",
    );
    const reverse = findShortestRouteBetweenPlaces(
      routeGraph,
      "main_auditorium",
      "rq_room_325f",
    );

    expect(forward === null).toEqual(false);
    expect(reverse === null).toEqual(false);
    const forwardPresentation = createRoutePresentation(
      forward ?? [],
      routeGraph.nodes,
      routeGraph.nodes.find((node) => node.placeId === "rq_room_325f")?.id ?? null,
    );
    const reversePresentation = createRoutePresentation(
      reverse ?? [],
      routeGraph.nodes,
      routeGraph.nodes.find((node) => node.placeId === "main_auditorium")?.id ?? null,
    );

    expect([...forwardPresentation.floorIds].sort()).toEqual([
      "campus",
      "rq-1f",
      "rq-2f",
      "rq-3f",
    ]);
    expect([...reversePresentation.floorIds].sort()).toEqual([
      "campus",
      "rq-1f",
      "rq-2f",
      "rq-3f",
    ]);
    expect(forwardPresentation.floorsById.get("rq-2f")?.walkEdges).toEqual([]);
    expect(reversePresentation.floorsById.get("rq-2f")?.walkEdges).toEqual([]);
    expect(
      forwardPresentation.floorsById.get("rq-2f")?.transferMarkers.length,
    ).toEqual(1);
    expect(
      reversePresentation.floorsById.get("rq-2f")?.transferMarkers.length,
    ).toEqual(1);
  });
});
