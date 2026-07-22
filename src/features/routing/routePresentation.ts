import type { RouteEdge, RouteNode } from "../../data/types";

export type RouteWalkEdge = Extract<RouteEdge, { kind: "walk" }>;

export type RouteTransferNode = Pick<RouteNode, "id" | "floorId" | "x" | "y">;

export type RouteFloorPresentation = {
  walkEdges: readonly RouteWalkEdge[];
  transferNodes: readonly RouteTransferNode[];
};

export type RoutePresentation = {
  floorIds: ReadonlySet<string>;
  floorsById: ReadonlyMap<string, RouteFloorPresentation>;
};

type MutableFloorPresentation = {
  walkEdges: RouteWalkEdge[];
  transferNodesById: Map<string, RouteTransferNode>;
};

export function createRoutePresentation(
  routeEdges: readonly RouteEdge[],
  routeNodes: readonly RouteNode[],
): RoutePresentation {
  const nodeById = new Map(routeNodes.map((node) => [node.id, node]));
  const mutableFloors = new Map<string, MutableFloorPresentation>();

  const getFloor = (floorId: string) => {
    let floor = mutableFloors.get(floorId);
    if (!floor) {
      floor = { walkEdges: [], transferNodesById: new Map() };
      mutableFloors.set(floorId, floor);
    }
    return floor;
  };

  for (const edge of routeEdges) {
    if (edge.kind === "walk") {
      getFloor(edge.floorId).walkEdges.push(edge);
      continue;
    }

    for (const nodeId of [edge.nodeA, edge.nodeB]) {
      const node = nodeById.get(nodeId);
      if (!node) {
        continue;
      }
      getFloor(node.floorId).transferNodesById.set(node.id, {
        id: node.id,
        floorId: node.floorId,
        x: node.x,
        y: node.y,
      });
    }
  }

  const floorsById = new Map<string, RouteFloorPresentation>();
  for (const [floorId, floor] of mutableFloors) {
    floorsById.set(floorId, {
      walkEdges: floor.walkEdges,
      transferNodes: [...floor.transferNodesById.values()],
    });
  }

  return {
    floorIds: new Set(floorsById.keys()),
    floorsById,
  };
}
