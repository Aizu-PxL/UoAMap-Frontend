import { describe, expect, test } from "bun:test";
import type { RouteEdge, RouteGraph, RouteNode } from "../../data/types";
import { findShortestRoute } from "./findShortestRoute";

function node(id: string, floorId = "test-floor"): RouteNode {
  return {
    id,
    floorId,
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
  floorId = "test-floor",
): RouteEdge {
  return {
    id,
    kind: "walk",
    floorId,
    nodeA,
    nodeB,
    distance,
    pathD: "M 0 0 L 1 1",
  };
}

function transferEdge(
  id: string,
  nodeA: string,
  nodeB: string,
  distance: number,
): RouteEdge {
  return { id, kind: "transfer", nodeA, nodeB, distance };
}

describe("findShortestRoute synthetic algorithm", () => {
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

  test("2フロア・2階段では総距離が短い階段のtransferエッジを経路順に含む", () => {
    const graph: RouteGraph = {
      nodes: [
        node("start", "floor-1"),
        node("stairs-cheap-1f", "floor-1"),
        node("stairs-expensive-1f", "floor-1"),
        node("stairs-cheap-2f", "floor-2"),
        node("stairs-expensive-2f", "floor-2"),
        node("end", "floor-2"),
      ],
      edges: [
        edge("start-cheap", "start", "stairs-cheap-1f", 2, "floor-1"),
        transferEdge("transfer-cheap", "stairs-cheap-1f", "stairs-cheap-2f", 60),
        edge("cheap-end", "stairs-cheap-2f", "end", 2, "floor-2"),
        edge("start-expensive", "start", "stairs-expensive-1f", 1, "floor-1"),
        transferEdge(
          "transfer-expensive",
          "stairs-expensive-1f",
          "stairs-expensive-2f",
          60,
        ),
        edge("expensive-end", "stairs-expensive-2f", "end", 10, "floor-2"),
      ],
    };

    expect(findShortestRoute(graph, "start", "end")?.map((item) => item.id)).toEqual([
      "start-cheap",
      "transfer-cheap",
      "cheap-end",
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
});
