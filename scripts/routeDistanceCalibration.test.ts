import { describe, expect, test } from "bun:test";
import type {
  RouteEdge,
  RouteGraph,
  RouteNode,
  RouteNodeKind,
} from "../src/data/types.js";
import {
  calibrateRouteGraphDistances,
  type RouteDistanceCalibrationPlan,
} from "./routeDistanceCalibration.js";

function node(
  id: string,
  floorId: string,
  x: number,
  y: number,
  kind: RouteNodeKind,
): RouteNode {
  return { id, floorId, x, y, kind };
}

function walk(
  id: string,
  floorId: string,
  nodeA: string,
  nodeB: string,
  distance: number,
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

function transfer(
  id: string,
  nodeA: string,
  nodeB: string,
  distance = 0,
): RouteEdge {
  return { id, kind: "transfer", nodeA, nodeB, distance };
}

function plan(
  parentFloorIdByFloorId: Readonly<Record<string, string>>,
  topologyNeutralFallbackFloorIds: readonly string[] = [],
  maxNormalizedRmse = 0.15,
): RouteDistanceCalibrationPlan {
  return {
    anchorFloorId: "campus",
    parentFloorIdByFloorId,
    topologyNeutralFallbackFloorIds,
    maxNormalizedRmse,
    stairEquivalentLocalDistance: 60,
  };
}

describe("calibrateRouteGraphDistances", () => {
  test("2つの入口対応点から単一倍率を導出してwalk距離を事前校正する", () => {
    const graph: RouteGraph = {
      nodes: [
        node("campus:a", "campus", 0, 0, "entrance"),
        node("campus:b", "campus", 10, 0, "entrance"),
        node("f:a", "f", 0, 0, "entrance"),
        node("f:b", "f", 20, 0, "entrance"),
      ],
      edges: [
        transfer("transfer:a", "campus:a", "f:a"),
        transfer("transfer:b", "campus:b", "f:b"),
        walk("f:walk", "f", "f:a", "f:b", 20),
      ],
    };

    const result = calibrateRouteGraphDistances(graph, plan({ f: "campus" }));

    expect(result.errors).toEqual([]);
    expect(result.graph.edges.find((edge) => edge.id === "f:walk")?.distance).toBe(10);
    expect(result.graph.nodes).toEqual(graph.nodes);
    expect(
      result.graph.edges.find((edge) => edge.id === "f:walk"),
    ).toMatchObject({ pathD: "M 0 0 L 1 1" });
    expect(result.graph.distanceCalibration?.floors).toEqual([
      { floorId: "campus", scale: 1, source: "anchor" },
      {
        floorId: "f",
        scale: 0.5,
        source: "transfer-pairs",
        parentFloorId: "campus",
        transferEdgeIds: ["transfer:a", "transfer:b"],
        normalizedRmse: 0,
      },
    ]);
  });

  test("親子校正を連鎖し階段へ両フロア倍率の幾何平均を使う", () => {
    const graph: RouteGraph = {
      nodes: [
        node("campus:a", "campus", 0, 0, "entrance"),
        node("campus:b", "campus", 10, 0, "entrance"),
        node("f1:a", "f1", 0, 0, "entrance"),
        node("f1:b", "f1", 20, 0, "entrance"),
        node("f1:s1", "f1", 0, 0, "stairs"),
        node("f1:s2", "f1", 20, 0, "stairs"),
        node("f2:s1", "f2", 0, 0, "stairs"),
        node("f2:s2", "f2", 40, 0, "stairs"),
      ],
      edges: [
        transfer("entrance:a", "campus:a", "f1:a"),
        transfer("entrance:b", "campus:b", "f1:b"),
        transfer("stairs:1", "f1:s1", "f2:s1", 60),
        transfer("stairs:2", "f1:s2", "f2:s2", 60),
        walk("f2:walk", "f2", "f2:s1", "f2:s2", 40),
      ],
    };

    const result = calibrateRouteGraphDistances(
      graph,
      plan({ f1: "campus", f2: "f1" }),
    );

    expect(result.errors).toEqual([]);
    expect(
      result.graph.distanceCalibration?.floors.find((floor) => floor.floorId === "f2")
        ?.scale,
    ).toBe(0.25);
    expect(result.graph.edges.find((edge) => edge.id === "f2:walk")?.distance).toBe(10);
    expect(result.graph.edges.find((edge) => edge.id === "stairs:1")?.distance).toBeCloseTo(
      60 * Math.sqrt(0.5 * 0.25),
      12,
    );
    expect(result.graph.edges.find((edge) => edge.id === "entrance:a")?.distance).toBe(0);
  });

  test("対応点不足とゼロ基線を拒否する", () => {
    const onePair: RouteGraph = {
      nodes: [
        node("campus:a", "campus", 0, 0, "entrance"),
        node("f:a", "f", 0, 0, "entrance"),
      ],
      edges: [transfer("transfer:a", "campus:a", "f:a")],
    };
    const zeroBaseline: RouteGraph = {
      nodes: [
        node("campus:a", "campus", 0, 0, "entrance"),
        node("campus:b", "campus", 0, 0, "entrance"),
        node("f:a", "f", 0, 0, "entrance"),
        node("f:b", "f", 10, 0, "entrance"),
      ],
      edges: [
        transfer("transfer:a", "campus:a", "f:a"),
        transfer("transfer:b", "campus:b", "f:b"),
      ],
    };

    expect(
      calibrateRouteGraphDistances(onePair, plan({ f: "campus" })).errors,
    ).toEqual([
      "距離校正floor f は親 campus との対応transferを2点以上必要とします（現在1点）",
    ]);
    expect(
      calibrateRouteGraphDistances(zeroBaseline, plan({ f: "campus" })).errors,
    ).toEqual([
      "距離校正floor f の対応transfer transfer:a / transfer:b にゼロ基線があります",
    ]);
  });

  test("単一倍率で説明できない対応点をRMSE上限で拒否する", () => {
    const graph: RouteGraph = {
      nodes: [
        node("campus:a", "campus", 0, 0, "entrance"),
        node("campus:b", "campus", 10, 0, "entrance"),
        node("campus:c", "campus", 0, 10, "entrance"),
        node("f:a", "f", 0, 0, "entrance"),
        node("f:b", "f", 20, 0, "entrance"),
        node("f:c", "f", 0, 40, "entrance"),
      ],
      edges: [
        transfer("transfer:a", "campus:a", "f:a"),
        transfer("transfer:b", "campus:b", "f:b"),
        transfer("transfer:c", "campus:c", "f:c"),
      ],
    };

    const result = calibrateRouteGraphDistances(
      graph,
      plan({ f: "campus" }, [], 0.01),
    );

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toStartWith("距離校正floor f の正規化RMSE ");
  });

  test("未知の親・未設定floor・親循環を拒否する", () => {
    const graph: RouteGraph = {
      nodes: [
        node("campus:a", "campus", 0, 0, "corridor"),
        node("f:a", "f", 0, 0, "corridor"),
      ],
      edges: [],
    };

    expect(
      calibrateRouteGraphDistances(graph, plan({ f: "missing" })).errors,
    ).toContain("距離校正floor f の親 missing がRouteグラフにありません");
    expect(calibrateRouteGraphDistances(graph, plan({})).errors).toContain(
      "距離校正floor f に親またはfallbackが設定されていません",
    );

    const cycleGraph: RouteGraph = {
      nodes: [
        node("campus:a", "campus", 0, 0, "corridor"),
        node("a:point", "a", 0, 0, "corridor"),
        node("b:point", "b", 0, 0, "corridor"),
      ],
      edges: [],
    };

    expect(
      calibrateRouteGraphDistances(cycleGraph, plan({ a: "b", b: "a" })).errors,
    ).toContain("距離校正の親指定が a を含む循環になっています");
  });

  test("topology-neutral fallbackは入口1本・階段なしだけを許可する", () => {
    const valid: RouteGraph = {
      nodes: [
        node("campus:a", "campus", 0, 0, "entrance"),
        node("u:a", "u", 0, 0, "entrance"),
      ],
      edges: [transfer("entrance:a", "campus:a", "u:a")],
    };
    const secondEntrance: RouteGraph = {
      nodes: [
        ...valid.nodes,
        node("campus:b", "campus", 10, 0, "entrance"),
        node("u:b", "u", 10, 0, "entrance"),
      ],
      edges: [
        ...valid.edges,
        transfer("entrance:b", "campus:b", "u:b"),
      ],
    };
    const stairs: RouteGraph = {
      nodes: [
        ...valid.nodes,
        node("u:s", "u", 5, 0, "stairs"),
        node("v:s", "v", 5, 0, "stairs"),
      ],
      edges: [
        ...valid.edges,
        transfer("stairs:a", "u:s", "v:s", 60),
      ],
    };

    const validResult = calibrateRouteGraphDistances(valid, plan({}, ["u"]));
    expect(validResult.errors).toEqual([]);
    expect(validResult.graph.distanceCalibration?.floors).toContainEqual({
      floorId: "u",
      scale: 1,
      source: "topology-neutral-fallback",
    });
    expect(
      calibrateRouteGraphDistances(secondEntrance, plan({}, ["u"])).errors,
    ).toContain(
      "距離校正fallback floor u は入口transfer 1本・階段transfer 0本である必要があります（入口2、階段0、不明0）",
    );
    expect(
      calibrateRouteGraphDistances(stairs, plan({}, ["u", "v"])).errors,
    ).toContain(
      "距離校正fallback floor u は入口transfer 1本・階段transfer 0本である必要があります（入口1、階段1、不明0）",
    );
  });
});
