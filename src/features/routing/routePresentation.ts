import type { RouteEdge, RouteNode } from "../../data/types";

export type RouteWalkEdge = Extract<RouteEdge, { kind: "walk" }>;

type RouteTransferMarkerBase = Pick<RouteNode, "id" | "floorId" | "x" | "y">;

export type RouteTransferMarker =
  | (RouteTransferMarkerBase & {
      kind: "stairs";
      direction: "up" | "down";
    })
  | (RouteTransferMarkerBase & {
      kind: "entrance";
    });

export type RouteFloorPresentation = {
  walkEdges: readonly RouteWalkEdge[];
  transferMarkers: readonly RouteTransferMarker[];
};

export type RoutePresentation = {
  floorIds: ReadonlySet<string>;
  floorsById: ReadonlyMap<string, RouteFloorPresentation>;
};

type MutableFloorPresentation = {
  walkEdges: RouteWalkEdge[];
  transferMarkersById: Map<string, RouteTransferMarker>;
};

function getNextNodeId(edge: RouteEdge, currentNodeId: string): string | null {
  if (edge.nodeA === currentNodeId) {
    return edge.nodeB;
  }
  if (edge.nodeB === currentNodeId) {
    return edge.nodeA;
  }
  return null;
}

export function createRoutePresentation(
  routeEdges: readonly RouteEdge[],
  routeNodes: readonly RouteNode[],
  startNodeId: string | null,
): RoutePresentation {
  const nodeById = new Map(routeNodes.map((node) => [node.id, node]));
  const mutableFloors = new Map<string, MutableFloorPresentation>();

  const getFloor = (floorId: string) => {
    let floor = mutableFloors.get(floorId);
    if (!floor) {
      floor = { walkEdges: [], transferMarkersById: new Map() };
      mutableFloors.set(floorId, floor);
    }
    return floor;
  };

  let currentNodeId =
    startNodeId !== null && nodeById.has(startNodeId) ? startNodeId : null;

  for (const edge of routeEdges) {
    if (edge.kind === "walk") {
      getFloor(edge.floorId).walkEdges.push(edge);
    } else {
      const nodeA = nodeById.get(edge.nodeA);
      const nodeB = nodeById.get(edge.nodeB);
      if (nodeA) {
        getFloor(nodeA.floorId);
      }
      if (nodeB) {
        getFloor(nodeB.floorId);
      }

      if (nodeA?.kind === "entrance" && nodeB?.kind === "entrance") {
        for (const node of [nodeA, nodeB]) {
          getFloor(node.floorId).transferMarkersById.set(node.id, {
            id: node.id,
            floorId: node.floorId,
            x: node.x,
            y: node.y,
            kind: "entrance",
          });
        }
      } else if (
        currentNodeId !== null &&
        nodeA?.kind === "stairs" &&
        nodeB?.kind === "stairs" &&
        (currentNodeId === edge.nodeA || currentNodeId === edge.nodeB)
      ) {
        const departureNode = nodeById.get(currentNodeId);
        if (departureNode?.kind === "stairs") {
          getFloor(departureNode.floorId).transferMarkersById.set(
            departureNode.id,
            {
              id: departureNode.id,
              floorId: departureNode.floorId,
              x: departureNode.x,
              y: departureNode.y,
              kind: "stairs",
              // Route抽出時にnodeA=下階、nodeB=上階の順で生成される。
              direction: currentNodeId === edge.nodeA ? "up" : "down",
            },
          );
        }
      }
    }

    if (currentNodeId !== null) {
      currentNodeId = getNextNodeId(edge, currentNodeId);
    }
  }

  const floorsById = new Map<string, RouteFloorPresentation>();
  for (const [floorId, floor] of mutableFloors) {
    floorsById.set(floorId, {
      walkEdges: floor.walkEdges,
      transferMarkers: [...floor.transferMarkersById.values()],
    });
  }

  return {
    floorIds: new Set(floorsById.keys()),
    floorsById,
  };
}
