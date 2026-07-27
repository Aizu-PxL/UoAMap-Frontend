import { describe, expect, test } from "bun:test";
import type { RouteEdge, RouteNode } from "../../data/types";
import { findShortestRouteBetweenPlaces } from "./findShortestRoute";
import { routeGraph } from "./routeGraph";
import { createRoutePresentation } from "./routePresentation";

const nodes: RouteNode[] = [
  { id: "f1:a", floorId: "f1", x: 0, y: 0, kind: "corridor" },
  { id: "f1:b", floorId: "f1", x: 10, y: 0, kind: "stairs" },
  { id: "f2:b", floorId: "f2", x: 10, y: 0, kind: "stairs" },
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
  pathD: "M 10 0 L 20 0",
};

const transferEdge: RouteEdge = {
  id: "transfer:stairs:f1:f2",
  kind: "transfer",
  nodeA: "f1:b",
  nodeB: "f2:b",
  distance: 60,
};

describe("createRoutePresentation", () => {
  test("空経路は空の表示モデルになる", () => {
    const presentation = createRoutePresentation([], nodes);

    expect([...presentation.floorIds]).toEqual([]);
    expect([...presentation.floorsById]).toEqual([]);
  });

  test("walkとtransferをフロア別に分配しtransfer-onlyフロアを含める", () => {
    const presentation = createRoutePresentation(
      [secondWalkEdge, walkEdge, transferEdge],
      nodes,
    );

    expect([...presentation.floorIds]).toEqual(["f1", "f2"]);
    expect(presentation.floorsById.get("f1")?.walkEdges).toEqual([
      secondWalkEdge,
      walkEdge,
    ]);
    expect(presentation.floorsById.get("f1")?.transferNodes).toEqual([
      { id: "f1:b", floorId: "f1", x: 10, y: 0 },
    ]);
    expect(presentation.floorsById.get("f2")?.walkEdges).toEqual([]);
    expect(presentation.floorsById.get("f2")?.transferNodes).toEqual([
      { id: "f2:b", floorId: "f2", x: 10, y: 0 },
    ]);
  });

  test("同じtransfer nodeを重複せず、未知endpointは無視する", () => {
    const repeatedTransfer: RouteEdge = {
      ...transferEdge,
      id: "transfer:stairs:f1:f2:repeat",
    };
    const unknownTransfer: RouteEdge = {
      id: "transfer:unknown",
      kind: "transfer",
      nodeA: "missing",
      nodeB: "f2:b",
      distance: 0,
    };

    const presentation = createRoutePresentation(
      [transferEdge, repeatedTransfer, unknownTransfer],
      nodes,
    );

    expect(presentation.floorsById.get("f1")?.transferNodes).toEqual([
      { id: "f1:b", floorId: "f1", x: 10, y: 0 },
    ]);
    expect(presentation.floorsById.get("f2")?.transferNodes).toEqual([
      { id: "f2:b", floorId: "f2", x: 10, y: 0 },
    ]);
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
    );
    const reversePresentation = createRoutePresentation(
      reverse ?? [],
      routeGraph.nodes,
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
      forwardPresentation.floorsById.get("rq-2f")?.transferNodes.length,
    ).toEqual(1);
    expect(
      reversePresentation.floorsById.get("rq-2f")?.transferNodes.length,
    ).toEqual(1);
  });
});
