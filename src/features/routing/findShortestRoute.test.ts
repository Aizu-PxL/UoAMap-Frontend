import { describe, expect, test } from "bun:test";
import { mockEvents } from "../../data/mock/events";
import { places } from "../../data/places";
import type { RouteEdge, RouteGraph, RouteNode } from "../../data/types";
import {
  findShortestRoute,
  findShortestRouteBetweenPlaces,
} from "./findShortestRoute";
import { routeGraph } from "./routeGraph";

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

  test("RQ1FからRQ3Fへの実経路はtransferエッジを2本含む", () => {
    const route = findShortestRouteBetweenPlaces(routeGraph, "rq1-161", "rq3-325f");

    expect(route === null).toEqual(false);
    expect(route?.filter((item) => item.kind === "transfer").length).toEqual(2);
  });

  test("RQ1FからRQ2Fへの実経路はtransferエッジを1本含む", () => {
    const route = findShortestRouteBetweenPlaces(routeGraph, "rq1-161", "rq2-201f");

    expect(route === null).toEqual(false);
    expect(route?.filter((item) => item.kind === "transfer").length).toEqual(1);
  });

  test("RQ3Fと講堂の実経路は全4フロアと入口transferを通る", () => {
    const route = findShortestRouteBetweenPlaces(
      routeGraph,
      "rq3-325f",
      "auditorium",
    );
    const reverseRoute = findShortestRouteBetweenPlaces(
      routeGraph,
      "auditorium",
      "rq3-325f",
    );

    expect(route === null).toEqual(false);
    expect(reverseRoute === null).toEqual(false);

    const nodeById = new Map(routeGraph.nodes.map((item) => [item.id, item]));
    const routeFloorIds = new Set<string>();
    for (const edge of route ?? []) {
      if (edge.kind === "walk") {
        routeFloorIds.add(edge.floorId);
        continue;
      }
      const nodeA = nodeById.get(edge.nodeA);
      const nodeB = nodeById.get(edge.nodeB);
      if (nodeA) {
        routeFloorIds.add(nodeA.floorId);
      }
      if (nodeB) {
        routeFloorIds.add(nodeB.floorId);
      }
    }

    expect([...routeFloorIds].sort()).toEqual([
      "campus",
      "rq-1f",
      "rq-2f",
      "rq-3f",
    ]);

    const transferEdges = (route ?? []).filter(
      (edge) => edge.kind === "transfer",
    );
    const stairTransferEdges = transferEdges.filter((edge) => {
      const nodeA = nodeById.get(edge.nodeA);
      const nodeB = nodeById.get(edge.nodeB);
      return nodeA?.kind === "stairs" && nodeB?.kind === "stairs";
    });
    expect(transferEdges.length).toEqual(3);
    expect(stairTransferEdges.length).toEqual(2);
    expect(
      transferEdges.filter((edge) => {
        const nodeA = nodeById.get(edge.nodeA);
        const nodeB = nodeById.get(edge.nodeB);
        return nodeA?.kind === "entrance" && nodeB?.kind === "entrance";
      }).map((edge) => edge.id),
    ).toEqual(["transfer:entrance:rq-west-main:campus:rq-1f"]);
  });

  test("学生ホール1Fの4地点が相互に到達可能", () => {
    const placeIds = [
      "sh-cafeteria",
      "sh-reception",
      "sh-hall",
      "sh-shop",
    ];

    for (const startPlaceId of placeIds) {
      for (const endPlaceId of placeIds) {
        expect(
          findShortestRouteBetweenPlaces(routeGraph, startPlaceId, endPlaceId) ===
            null,
        ).toEqual(false);
      }
    }
  });

  test("研究棟から学生ホールへ2つの建物入口を通って到達できる", () => {
    const route = findShortestRouteBetweenPlaces(
      routeGraph,
      "rq1-161",
      "sh-cafeteria",
    );

    expect(route === null).toEqual(false);
    expect(
      route
        ?.filter((item) => item.kind === "transfer")
        .map((item) => item.id),
    ).toEqual([
      "transfer:entrance:rq-west-main:campus:rq-1f",
      "transfer:entrance:sh-main:campus:sh-1f",
    ]);
  });

  test("学生ホール1Fと2Fの中央階段transferが生成される", () => {
    expect(
      routeGraph.edges.some(
        (edge) =>
          edge.id === "transfer:sh-stairs-central:sh-1f:sh-2f" &&
          edge.kind === "transfer",
      ),
    ).toEqual(true);
  });

  test("UBIC内の3地点が相互に到達可能", () => {
    const placeIds = ["ubic-3d-theater", "ubic-lab", "ubic-motion"];

    for (const startPlaceId of placeIds) {
      for (const endPlaceId of placeIds) {
        expect(
          findShortestRouteBetweenPlaces(routeGraph, startPlaceId, endPlaceId) ===
            null,
        ).toEqual(false);
      }
    }
  });

  test("UBIC建物地点から室内へ入口transferを通って到達できる", () => {
    for (const destinationPlaceId of [
      "ubic-3d-theater",
      "ubic-lab",
      "ubic-motion",
    ]) {
      const route = findShortestRouteBetweenPlaces(
        routeGraph,
        "ubic",
        destinationPlaceId,
      );
      expect(route === null).toEqual(false);
      expect(
        route
          ?.filter((item) => item.kind === "transfer")
          .map((item) => item.id),
      ).toEqual(["transfer:entrance:ubic-main:campus:ubic-1f"]);
    }
  });

  test("研究棟からUBICへ2つの建物入口を通って到達できる", () => {
    const route = findShortestRouteBetweenPlaces(
      routeGraph,
      "rq1-161",
      "ubic-motion",
    );

    expect(route === null).toEqual(false);
    expect(
      route
        ?.filter((item) => item.kind === "transfer")
        .map((item) => item.id),
    ).toEqual([
      "transfer:entrance:rq-west-main:campus:rq-1f",
      "transfer:entrance:ubic-main:campus:ubic-1f",
    ]);
  });

  test("講義棟1F・2Fの9地点が相互に到達可能", () => {
    const placeIds = [
      "lh-large",
      "lh-m8",
      "lh-m10",
      "lh-m2",
      "lh-m3",
      "lh-m4",
      "lh-m5",
      "lh-m6",
      "lh-m7",
    ];

    for (const startPlaceId of placeIds) {
      for (const endPlaceId of placeIds) {
        expect(
          findShortestRouteBetweenPlaces(routeGraph, startPlaceId, endPlaceId) ===
            null,
        ).toEqual(false);
      }
    }
  });

  test("講義棟1Fと2Fの東側階段transferが生成される", () => {
    expect(
      routeGraph.edges.some(
        (edge) =>
          edge.id === "transfer:lh-stairs-east:lh-1f:lh-2f" &&
          edge.kind === "transfer",
      ),
    ).toEqual(true);
  });

  test("研究棟から講義棟2Fへ両建物入口と階段を通って到達できる", () => {
    const route = findShortestRouteBetweenPlaces(
      routeGraph,
      "rq1-161",
      "lh-m2",
    );

    expect(route === null).toEqual(false);
    expect(
      route
        ?.filter((item) => item.kind === "transfer")
        .map((item) => item.id),
    ).toEqual([
      "transfer:entrance:rq-west-main:campus:rq-1f",
      "transfer:entrance:lh-main:campus:lh-1f",
      "transfer:lh-stairs-east:lh-1f:lh-2f",
    ]);
  });

  test("LICTiA内の2地点が相互に到達可能", () => {
    expect(
      findShortestRouteBetweenPlaces(
        routeGraph,
        "lictia-chamber",
        "lictia-innovation",
      ) === null,
    ).toEqual(false);
    expect(
      findShortestRouteBetweenPlaces(
        routeGraph,
        "lictia-innovation",
        "lictia-chamber",
      ) === null,
    ).toEqual(false);
  });

  test("研究棟からLICTiAへ2つの建物入口を通って到達できる", () => {
    const route = findShortestRouteBetweenPlaces(
      routeGraph,
      "rq1-161",
      "lictia-innovation",
    );

    expect(route === null).toEqual(false);
    expect(
      route
        ?.filter((item) => item.kind === "transfer")
        .map((item) => item.id),
    ).toEqual([
      "transfer:entrance:rq-west-main:campus:rq-1f",
      "transfer:entrance:lictia-main:campus:lictia-1f",
    ]);
  });

  test("研究棟からロボット格納庫へ到達できる", () => {
    const route = findShortestRouteBetweenPlaces(
      routeGraph,
      "rq1-161",
      "robot-garage",
    );

    expect(route === null).toEqual(false);
    expect(
      route
        ?.filter((item) => item.kind === "transfer")
        .map((item) => item.id),
    ).toEqual(["transfer:entrance:rq-west-main:campus:rq-1f"]);
  });

  test("campus-all以外の全38 PlaceがRouteへ収録され講堂から到達可能", () => {
    const excludedPlaceIds = new Set(["campus-all"]);
    const expectedPlaceIds = places
      .filter((place) => !excludedPlaceIds.has(place.id))
      .map((place) => place.id)
      .sort();
    const routedPlaceIds = routeGraph.nodes
      .flatMap((item) => (item.placeId ? [item.placeId] : []))
      .sort();

    expect(routedPlaceIds).toEqual(expectedPlaceIds);
    expect(expectedPlaceIds.length).toEqual(38);
    for (const placeId of expectedPlaceIds) {
      expect(
        findShortestRouteBetweenPlaces(routeGraph, "auditorium", placeId) ===
          null,
      ).toEqual(false);
    }
  });

  test("全Routeノードが単一連結成分に属する", () => {
    const startNodeId = routeGraph.nodes[0]?.id;
    expect(typeof startNodeId).toEqual("string");
    for (const routeNode of routeGraph.nodes) {
      expect(
        startNodeId
          ? findShortestRoute(routeGraph, startNodeId, routeNode.id) === null
          : true,
      ).toEqual(false);
    }
  });

  test("全イベント地点とQRモック地点がRoute対応済み", () => {
    const routedPlaceIds = new Set(
      routeGraph.nodes.flatMap((item) => (item.placeId ? [item.placeId] : [])),
    );
    const eventPlaceIds = new Set(
      mockEvents
        .map((event) => event.placeId)
        .filter((placeId) => placeId !== "campus-all"),
    );
    for (const placeId of eventPlaceIds) {
      expect(routedPlaceIds.has(placeId)).toEqual(true);
    }

    for (const qrPlaceId of ["sh-hall", "ubic", "lh-large"]) {
      expect(routedPlaceIds.has(qrPlaceId)).toEqual(true);
    }
  });
});
