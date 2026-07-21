import type { RouteEdge, RouteGraph } from "../../data/types";

type AdjacentEdge = {
  nodeId: string;
  edge: RouteEdge;
};

/**
 * 無向グラフ上の最短経路をDijkstra法で求め、始点から順序付けたエッジ列を返す。
 * 到達不能・未知ノードはnull、始点と終点が同じ場合は空配列。
 */
export function findShortestRoute(
  graph: RouteGraph,
  startNodeId: string,
  endNodeId: string,
): RouteEdge[] | null {
  if (startNodeId === endNodeId) {
    return graph.nodes.some((node) => node.id === startNodeId) ? [] : null;
  }

  const nodeIds = new Set(graph.nodes.map((node) => node.id));
  if (!nodeIds.has(startNodeId) || !nodeIds.has(endNodeId)) {
    return null;
  }

  const adjacency = new Map<string, AdjacentEdge[]>();
  for (const nodeId of nodeIds) {
    adjacency.set(nodeId, []);
  }
  for (const edge of graph.edges) {
    adjacency.get(edge.nodeA)?.push({ nodeId: edge.nodeB, edge });
    adjacency.get(edge.nodeB)?.push({ nodeId: edge.nodeA, edge });
  }

  const distances = new Map<string, number>(
    [...nodeIds].map((nodeId) => [nodeId, Number.POSITIVE_INFINITY]),
  );
  const previous = new Map<
    string,
    {
      nodeId: string;
      edge: RouteEdge;
    }
  >();
  const visited = new Set<string>();
  distances.set(startNodeId, 0);

  while (visited.size < nodeIds.size) {
    let currentNodeId: string | null = null;
    let currentDistance = Number.POSITIVE_INFINITY;

    for (const [nodeId, distance] of distances) {
      if (!visited.has(nodeId) && distance < currentDistance) {
        currentNodeId = nodeId;
        currentDistance = distance;
      }
    }

    if (currentNodeId === null || !Number.isFinite(currentDistance)) {
      break;
    }
    if (currentNodeId === endNodeId) {
      break;
    }

    visited.add(currentNodeId);
    for (const adjacent of adjacency.get(currentNodeId) ?? []) {
      if (visited.has(adjacent.nodeId)) {
        continue;
      }
      const nextDistance = currentDistance + adjacent.edge.distance;
      if (nextDistance < (distances.get(adjacent.nodeId) ?? Number.POSITIVE_INFINITY)) {
        distances.set(adjacent.nodeId, nextDistance);
        previous.set(adjacent.nodeId, {
          nodeId: currentNodeId,
          edge: adjacent.edge,
        });
      }
    }
  }

  if (!previous.has(endNodeId)) {
    return null;
  }

  const route: RouteEdge[] = [];
  let currentNodeId = endNodeId;
  while (currentNodeId !== startNodeId) {
    const step = previous.get(currentNodeId);
    if (!step) {
      return null;
    }
    route.unshift(step.edge);
    currentNodeId = step.nodeId;
  }
  return route;
}

/** Placeに紐付いたノード同士の最短経路。未収録Placeはnull。 */
export function findShortestRouteBetweenPlaces(
  graph: RouteGraph,
  startPlaceId: string,
  endPlaceId: string,
): RouteEdge[] | null {
  const startNode = graph.nodes.find((node) => node.placeId === startPlaceId);
  const endNode = graph.nodes.find((node) => node.placeId === endPlaceId);
  if (!startNode || !endNode) {
    return null;
  }
  return findShortestRoute(graph, startNode.id, endNode.id);
}
