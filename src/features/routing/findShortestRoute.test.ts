import { describe, expect, test } from "bun:test";
import type { RouteEdge, RouteGraph, RouteNode } from "../../data/types";
import {
  findShortestRoute,
  findShortestRouteBetweenPlaces,
} from "./findShortestRoute";
import { routeGraph } from "./routeGraph";

function node(id: string): RouteNode {
  return {
    id,
    floorId: "test-floor",
    x: 0,
    y: 0,
    kind: "corridor",
  };
}

function edge(
  id: string,
  nodeA: string,
  nodeB: string,
  distance: number,
): RouteEdge {
  return {
    id,
    floorId: "test-floor",
    nodeA,
    nodeB,
    distance,
    pathD: "M 0 0 L 1 1",
  };
}

describe("findShortestRoute", () => {
  test("直線状のグラフを始点から順に返す", () => {
    const graph: RouteGraph = {
      nodes: [node("a"), node("b"), node("c")],
      edges: [edge("ab", "a", "b", 2), edge("bc", "b", "c", 3)],
    };

    expect(findShortestRoute(graph, "a", "c")?.map((item) => item.id)).toEqual([
      "ab",
      "bc",
    ]);
  });

  test("分岐がある場合に距離の短い経路を選ぶ", () => {
    const graph: RouteGraph = {
      nodes: [node("a"), node("b"), node("c"), node("d")],
      edges: [
        edge("ab", "a", "b", 2),
        edge("bd", "b", "d", 2),
        edge("ac", "a", "c", 1),
        edge("cd", "c", "d", 8),
      ],
    };

    expect(findShortestRoute(graph, "a", "d")?.map((item) => item.id)).toEqual([
      "ab",
      "bd",
    ]);
  });

  test("始点と終点が同じ場合は空配列を返す", () => {
    const graph: RouteGraph = { nodes: [node("a")], edges: [] };

    expect(findShortestRoute(graph, "a", "a")).toEqual([]);
  });

  test("到達不能の場合はnullを返す", () => {
    const graph: RouteGraph = {
      nodes: [node("a"), node("b"), node("c")],
      edges: [edge("ab", "a", "b", 1)],
    };

    expect(findShortestRoute(graph, "a", "c")).toBeNull();
  });

  test("未知のノードの場合はnullを返す", () => {
    const graph: RouteGraph = { nodes: [node("a")], edges: [] };

    expect(findShortestRoute(graph, "a", "missing")).toBeNull();
  });

  test("RQ1Fの対象5地点が相互に到達可能", () => {
    const placeIds = [
      "rq1-104f",
      "rq1-141e",
      "rq1-144f",
      "rq1-127",
      "rq1-161",
    ];

    for (const startPlaceId of placeIds) {
      for (const endPlaceId of placeIds) {
        const route = findShortestRouteBetweenPlaces(
          routeGraph,
          startPlaceId,
          endPlaceId,
        );
        expect(route === null).toEqual(false);
      }
    }
  });
});
