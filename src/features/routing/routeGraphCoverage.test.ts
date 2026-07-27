import { describe, expect, test } from "bun:test";
import qrMappings from "../../../uoamap-qr-mappings.json";
import { mockEvents } from "../../data/mock/events";
import { places } from "../../data/places";
import {
  findShortestRoute,
  findShortestRouteBetweenPlaces,
} from "./findShortestRoute";
import { routeGraph } from "./routeGraph";

describe("実生成Routeグラフcoverage", () => {
  test("RQ1Fの対象5地点が相互に到達可能", () => {
    const placeIds = [
      "rq_room_104f",
      "rq_room_141E",
      "rq_room_144f",
      "rq_room_127",
      "rq_room_161",
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
    const route = findShortestRouteBetweenPlaces(routeGraph, "rq_room_161", "rq_room_325f");

    expect(route === null).toEqual(false);
    expect(route?.filter((item) => item.kind === "transfer").length).toEqual(2);
  });

  test("RQ1FからRQ2Fへの実経路はtransferエッジを1本含む", () => {
    const route = findShortestRouteBetweenPlaces(routeGraph, "rq_room_161", "rq_room_201f");

    expect(route === null).toEqual(false);
    expect(route?.filter((item) => item.kind === "transfer").length).toEqual(1);
  });

  test("RQ3Fと講堂の実経路は全4フロアと入口transferを通る", () => {
    const route = findShortestRouteBetweenPlaces(
      routeGraph,
      "rq_room_325f",
      "main_auditorium",
    );
    const reverseRoute = findShortestRouteBetweenPlaces(
      routeGraph,
      "main_auditorium",
      "rq_room_325f",
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
    ).toEqual(["transfer:entrance:rq-southwest:campus:rq-1f"]);
  });

  test("学生ホール1Fの3地点が相互に到達可能", () => {
    const placeIds = [
      "sh_room_cafeteria",
      "sh_reception",
      "sh_room_shop",
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
      "rq_room_161",
      "sh_room_cafeteria",
    );

    expect(route === null).toEqual(false);
    expect(
      route
        ?.filter((item) => item.kind === "transfer")
        .map((item) => item.id),
    ).toEqual([
      "transfer:entrance:rq-northwest:campus:rq-1f",
      "transfer:entrance:sh_north:campus:sh-1f",
    ]);
  });

  test("学生ホール1Fと2Fの主階段transferが生成される", () => {
    expect(
      routeGraph.edges.some(
        (edge) =>
          edge.id === "transfer:sh_main_1:sh-1f:sh-2f" &&
          edge.kind === "transfer",
      ),
    ).toEqual(true);
  });

  test("UBIC内の3地点が相互に到達可能", () => {
    const placeIds = ["ubic_room_3dtheater", "ubic_room_RLA", "ubic_room_mar"];

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
      "ubic_room_3dtheater",
      "ubic_room_RLA",
      "ubic_room_mar",
    ]) {
      const route = findShortestRouteBetweenPlaces(
        routeGraph,
        "main_ubic_entrance",
        destinationPlaceId,
      );
      expect(route === null).toEqual(false);
      expect(
        route
          ?.filter((item) => item.kind === "transfer")
          .map((item) => item.id),
      ).toEqual(["transfer:entrance:ubic:campus:ubic-1f"]);
    }
  });

  test("研究棟からUBICへ2つの建物入口を通って到達できる", () => {
    const route = findShortestRouteBetweenPlaces(
      routeGraph,
      "rq_room_161",
      "ubic_room_mar",
    );

    expect(route === null).toEqual(false);
    expect(
      route
        ?.filter((item) => item.kind === "transfer")
        .map((item) => item.id),
    ).toEqual([
      "transfer:entrance:rq-northwest:campus:rq-1f",
      "transfer:entrance:ubic:campus:ubic-1f",
    ]);
  });

  test("講義棟1F・2Fの9地点が相互に到達可能", () => {
    const placeIds = [
      "lh_room_lth_1",
      "lh_room_m8",
      "lh_room_m10",
      "lh_room_m2",
      "lh_room_m3",
      "lh_room_m4",
      "lh_room_m5",
      "lh_room_m6",
      "lh_room_m7",
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

  test("講義棟1Fと2Fの北東階段transferが生成される", () => {
    expect(
      routeGraph.edges.some(
        (edge) =>
          edge.id === "transfer:lh_northeast:lh-1f:lh-2f" &&
          edge.kind === "transfer",
      ),
    ).toEqual(true);
  });

  test("研究棟から講義棟2Fへ両建物入口と階段を通って到達できる", () => {
    const route = findShortestRouteBetweenPlaces(
      routeGraph,
      "rq_room_161",
      "lh_room_m2",
    );

    expect(route === null).toEqual(false);
    expect(
      route
        ?.filter((item) => item.kind === "transfer")
        .map((item) => item.id),
    ).toEqual([
      "transfer:entrance:rq-northwest:campus:rq-1f",
      "transfer:entrance:lh-west:campus:lh-1f",
      "transfer:lh_west:lh-1f:lh-2f",
    ]);
  });

  test("LICTiA内の2地点が相互に到達可能", () => {
    expect(
      findShortestRouteBetweenPlaces(
        routeGraph,
        "lictia_room_cswr",
        "lictia_room_is",
      ) === null,
    ).toEqual(false);
    expect(
      findShortestRouteBetweenPlaces(
        routeGraph,
        "lictia_room_is",
        "lictia_room_cswr",
      ) === null,
    ).toEqual(false);
  });

  test("研究棟からLICTiAへ2つの建物入口を通って到達できる", () => {
    const route = findShortestRouteBetweenPlaces(
      routeGraph,
      "rq_room_161",
      "lictia_room_is",
    );

    expect(route === null).toEqual(false);
    expect(
      route
        ?.filter((item) => item.kind === "transfer")
        .map((item) => item.id),
    ).toEqual([
      "transfer:entrance:rq-northwest:campus:rq-1f",
      "transfer:entrance:lictia:campus:lictia-1f",
    ]);
  });

  test("研究棟からロボット格納庫へ到達できる", () => {
    const route = findShortestRouteBetweenPlaces(
      routeGraph,
      "rq_room_161",
      "main_robothangar",
    );

    expect(route === null).toEqual(false);
    expect(
      route
        ?.filter((item) => item.kind === "transfer")
        .map((item) => item.id),
    ).toEqual(["transfer:entrance:rq-northwest:campus:rq-1f"]);
  });

  test("専用3ノードの座標・接続先を固定する", () => {
    const expectations = [
      {
        nodeId: "lh-1f:lh_room_m8",
        placeId: "lh_room_m8",
        x: 200,
        y: 450,
        neighborId: "lh-1f:lh_node_1f_13",
      },
      {
        nodeId: "sh-1f:sh_reception",
        placeId: "sh_reception",
        x: 66.5,
        y: 46.5,
        neighborId: "sh-1f:sh_node_1f_6",
      },
      {
        nodeId: "ubic-1f:ubic_room_3dtheater",
        placeId: "ubic_room_3dtheater",
        x: 39,
        y: 49,
        neighborId: "ubic-1f:ubic_node_2",
      },
    ];

    for (const expected of expectations) {
      const node = routeGraph.nodes.find((item) => item.id === expected.nodeId);
      expect(node && { id: node.id, placeId: node.placeId, x: node.x, y: node.y }).toEqual(
        { id: expected.nodeId, placeId: expected.placeId, x: expected.x, y: expected.y },
      );
      expect(
        routeGraph.edges.some(
          (edge) =>
            edge.kind === "walk" &&
            ((edge.nodeA === expected.nodeId && edge.nodeB === expected.neighborId) ||
              (edge.nodeB === expected.nodeId && edge.nodeA === expected.neighborId)),
        ),
      ).toEqual(true);
    }
  });

  test("生成グラフのノード・エッジ内訳を固定する", () => {
    expect(routeGraph.nodes.length).toEqual(336);
    expect(routeGraph.edges.length).toEqual(425);
    expect(routeGraph.edges.filter((edge) => edge.kind === "walk").length).toEqual(387);
    expect(routeGraph.edges.filter((edge) => edge.kind === "transfer").length).toEqual(38);
  });

  test("campus-all以外の全108 PlaceがRouteへ収録され講堂から到達可能", () => {
    const excludedPlaceIds = new Set(["campus-all"]);
    const expectedPlaceIds = places
      .filter((place) => !excludedPlaceIds.has(place.id))
      .map((place) => place.id)
      .sort();
    const routedPlaceIds = routeGraph.nodes
      .flatMap((item) => (item.placeId ? [item.placeId] : []))
      .sort();

    expect(routedPlaceIds).toEqual(expectedPlaceIds);
    expect(expectedPlaceIds.length).toEqual(108);
    for (const placeId of expectedPlaceIds) {
      expect(
        findShortestRouteBetweenPlaces(routeGraph, "main_auditorium", placeId) ===
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

    for (const qrPlaceId of qrMappings.map((qr) => qr.placeId)) {
      expect(routedPlaceIds.has(qrPlaceId)).toEqual(true);
    }
  });
});
