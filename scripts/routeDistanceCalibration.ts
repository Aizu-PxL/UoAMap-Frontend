import type {
  RouteDistanceCalibration,
  RouteDistanceCalibrationFloor,
  RouteEdge,
  RouteGraph,
  RouteNode,
} from "../src/data/types.js";

export type RouteDistanceCalibrationPlan = {
  anchorFloorId: string;
  parentFloorIdByFloorId: Readonly<Record<string, string>>;
  topologyNeutralFallbackFloorIds: readonly string[];
  maxNormalizedRmse: number;
  stairEquivalentLocalDistance: number;
};

export type RouteDistanceCalibrationResult = {
  graph: RouteGraph;
  errors: string[];
};

export const routeDistanceCalibrationPlan: RouteDistanceCalibrationPlan = {
  anchorFloorId: "campus",
  parentFloorIdByFloorId: {
    "rq-1f": "campus",
    "rq-2f": "rq-1f",
    "rq-3f": "rq-2f",
    "lh-1f": "campus",
    "lh-2f": "lh-1f",
    "sh-1f": "campus",
    "sh-2f": "campus",
  },
  topologyNeutralFallbackFloorIds: ["ubic-1f", "lictia-1f"],
  maxNormalizedRmse: 0.15,
  stairEquivalentLocalDistance: 60,
};

type TransferPair = {
  edge: Extract<RouteEdge, { kind: "transfer" }>;
  parentNode: RouteNode;
  childNode: RouteNode;
};

type PairDistance = {
  parentDistance: number;
  childDistance: number;
};

const minimumDistance = 1e-9;

/**
 * SVGごとの座標距離を、transfer対応点からcampus SVG基準へ校正する。
 * node座標とpathDは描画用のローカル座標のまま維持する。
 */
export function calibrateRouteGraphDistances(
  graph: RouteGraph,
  plan: RouteDistanceCalibrationPlan,
): RouteDistanceCalibrationResult {
  const errors: string[] = [];
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  const floorIds = new Set(graph.nodes.map((node) => node.floorId));
  const fallbackFloorIds = new Set(plan.topologyNeutralFallbackFloorIds);
  const metadataByFloorId = new Map<string, RouteDistanceCalibrationFloor>();
  const resolvingFloorIds = new Set<string>();

  if (!floorIds.has(plan.anchorFloorId)) {
    errors.push(`距離校正anchor floor ${plan.anchorFloorId} がRouteグラフにありません`);
  }
  if (!(plan.maxNormalizedRmse >= 0) || !Number.isFinite(plan.maxNormalizedRmse)) {
    errors.push("距離校正のmaxNormalizedRmseは0以上の有限値にしてください");
  }
  if (
    !(plan.stairEquivalentLocalDistance >= 0) ||
    !Number.isFinite(plan.stairEquivalentLocalDistance)
  ) {
    errors.push("距離校正のstairEquivalentLocalDistanceは0以上の有限値にしてください");
  }

  for (const floorId of fallbackFloorIds) {
    if (!floorIds.has(floorId)) {
      errors.push(`距離校正fallback floor ${floorId} がRouteグラフにありません`);
    }
    if (plan.parentFloorIdByFloorId[floorId] !== undefined) {
      errors.push(`距離校正floor ${floorId} は親指定とfallbackを同時に設定できません`);
    }
  }

  const classifyTransfer = (edge: Extract<RouteEdge, { kind: "transfer" }>) => {
    const nodeA = nodeById.get(edge.nodeA);
    const nodeB = nodeById.get(edge.nodeB);
    if (!nodeA || !nodeB) {
      return "unknown" as const;
    }
    if (nodeA.kind === "entrance" && nodeB.kind === "entrance") {
      return "entrance" as const;
    }
    if (nodeA.kind === "stairs" && nodeB.kind === "stairs") {
      return "stairs" as const;
    }
    return "unknown" as const;
  };

  for (const floorId of fallbackFloorIds) {
    const incidentTransfers = graph.edges.filter((edge) => {
      if (edge.kind !== "transfer") {
        return false;
      }
      return (
        nodeById.get(edge.nodeA)?.floorId === floorId ||
        nodeById.get(edge.nodeB)?.floorId === floorId
      );
    });
    const entranceCount = incidentTransfers.filter(
      (edge) => edge.kind === "transfer" && classifyTransfer(edge) === "entrance",
    ).length;
    const stairCount = incidentTransfers.filter(
      (edge) => edge.kind === "transfer" && classifyTransfer(edge) === "stairs",
    ).length;
    const unknownCount = incidentTransfers.length - entranceCount - stairCount;
    if (entranceCount !== 1 || stairCount !== 0 || unknownCount !== 0) {
      errors.push(
        `距離校正fallback floor ${floorId} は入口transfer 1本・階段transfer 0本である必要があります（入口${entranceCount}、階段${stairCount}、不明${unknownCount}）`,
      );
    }
  }

  const getTransferPairs = (parentFloorId: string, childFloorId: string) => {
    const pairs: TransferPair[] = [];
    for (const edge of graph.edges) {
      if (edge.kind !== "transfer") {
        continue;
      }
      const nodeA = nodeById.get(edge.nodeA);
      const nodeB = nodeById.get(edge.nodeB);
      if (!nodeA || !nodeB) {
        continue;
      }
      if (nodeA.floorId === parentFloorId && nodeB.floorId === childFloorId) {
        pairs.push({ edge, parentNode: nodeA, childNode: nodeB });
      } else if (
        nodeB.floorId === parentFloorId &&
        nodeA.floorId === childFloorId
      ) {
        pairs.push({ edge, parentNode: nodeB, childNode: nodeA });
      }
    }
    return pairs.sort((left, right) => left.edge.id.localeCompare(right.edge.id));
  };

  const resolveFloor = (floorId: string): RouteDistanceCalibrationFloor | null => {
    const existing = metadataByFloorId.get(floorId);
    if (existing) {
      return existing;
    }
    if (!floorIds.has(floorId)) {
      errors.push(`距離校正floor ${floorId} がRouteグラフにありません`);
      return null;
    }
    if (resolvingFloorIds.has(floorId)) {
      errors.push(`距離校正の親指定が ${floorId} を含む循環になっています`);
      return null;
    }
    if (floorId === plan.anchorFloorId) {
      const metadata: RouteDistanceCalibrationFloor = {
        floorId,
        scale: 1,
        source: "anchor",
      };
      metadataByFloorId.set(floorId, metadata);
      return metadata;
    }
    if (fallbackFloorIds.has(floorId)) {
      const metadata: RouteDistanceCalibrationFloor = {
        floorId,
        scale: 1,
        source: "topology-neutral-fallback",
      };
      metadataByFloorId.set(floorId, metadata);
      return metadata;
    }

    const parentFloorId = plan.parentFloorIdByFloorId[floorId];
    if (!parentFloorId) {
      errors.push(`距離校正floor ${floorId} に親またはfallbackが設定されていません`);
      return null;
    }
    if (!floorIds.has(parentFloorId)) {
      errors.push(`距離校正floor ${floorId} の親 ${parentFloorId} がRouteグラフにありません`);
      return null;
    }

    resolvingFloorIds.add(floorId);
    const parentMetadata = resolveFloor(parentFloorId);
    resolvingFloorIds.delete(floorId);
    if (!parentMetadata) {
      return null;
    }

    const pairs = getTransferPairs(parentFloorId, floorId);
    if (pairs.length < 2) {
      errors.push(
        `距離校正floor ${floorId} は親 ${parentFloorId} との対応transferを2点以上必要とします（現在${pairs.length}点）`,
      );
      return null;
    }

    const pairDistances: PairDistance[] = [];
    for (let leftIndex = 0; leftIndex < pairs.length; leftIndex += 1) {
      for (
        let rightIndex = leftIndex + 1;
        rightIndex < pairs.length;
        rightIndex += 1
      ) {
        const left = pairs[leftIndex];
        const right = pairs[rightIndex];
        const parentDistance = Math.hypot(
          right.parentNode.x - left.parentNode.x,
          right.parentNode.y - left.parentNode.y,
        );
        const childDistance = Math.hypot(
          right.childNode.x - left.childNode.x,
          right.childNode.y - left.childNode.y,
        );
        if (parentDistance <= minimumDistance || childDistance <= minimumDistance) {
          errors.push(
            `距離校正floor ${floorId} の対応transfer ${left.edge.id} / ${right.edge.id} にゼロ基線があります`,
          );
          return null;
        }
        pairDistances.push({ parentDistance, childDistance });
      }
    }

    const numerator = pairDistances.reduce(
      (sum, item) => sum + item.parentDistance * item.childDistance,
      0,
    );
    const denominator = pairDistances.reduce(
      (sum, item) => sum + item.childDistance ** 2,
      0,
    );
    const relativeScale = numerator / denominator;
    if (!(relativeScale > 0) || !Number.isFinite(relativeScale)) {
      errors.push(`距離校正floor ${floorId} の倍率を有限の正数として導出できません`);
      return null;
    }

    const squaredError = pairDistances.reduce(
      (sum, item) =>
        sum + (relativeScale * item.childDistance - item.parentDistance) ** 2,
      0,
    );
    const parentSquaredDistance = pairDistances.reduce(
      (sum, item) => sum + item.parentDistance ** 2,
      0,
    );
    const normalizedRmse = Math.sqrt(squaredError / parentSquaredDistance);
    if (normalizedRmse > plan.maxNormalizedRmse) {
      errors.push(
        `距離校正floor ${floorId} の正規化RMSE ${normalizedRmse} が上限 ${plan.maxNormalizedRmse} を超えています`,
      );
      return null;
    }

    const metadata: RouteDistanceCalibrationFloor = {
      floorId,
      scale: parentMetadata.scale * relativeScale,
      source: "transfer-pairs",
      parentFloorId,
      transferEdgeIds: pairs.map((pair) => pair.edge.id),
      normalizedRmse,
    };
    metadataByFloorId.set(floorId, metadata);
    return metadata;
  };

  for (const floorId of [...floorIds].sort()) {
    resolveFloor(floorId);
  }
  if (errors.length > 0) {
    return { graph, errors };
  }

  const scaleByFloorId = new Map(
    [...metadataByFloorId].map(([floorId, metadata]) => [floorId, metadata.scale]),
  );
  const calibratedEdges: RouteEdge[] = graph.edges.map((edge) => {
    if (edge.kind === "walk") {
      return {
        ...edge,
        distance: edge.distance * (scaleByFloorId.get(edge.floorId) ?? 1),
      };
    }

    const nodeA = nodeById.get(edge.nodeA);
    const nodeB = nodeById.get(edge.nodeB);
    if (!nodeA || !nodeB) {
      return edge;
    }
    if (nodeA.kind === "entrance" && nodeB.kind === "entrance") {
      return { ...edge, distance: 0 };
    }
    if (nodeA.kind === "stairs" && nodeB.kind === "stairs") {
      const scaleA = scaleByFloorId.get(nodeA.floorId) ?? 1;
      const scaleB = scaleByFloorId.get(nodeB.floorId) ?? 1;
      return {
        ...edge,
        distance:
          plan.stairEquivalentLocalDistance * Math.sqrt(scaleA * scaleB),
      };
    }
    return edge;
  });
  const distanceCalibration: RouteDistanceCalibration = {
    unit: "campus-svg-unit",
    stairEquivalentLocalDistance: plan.stairEquivalentLocalDistance,
    floors: [...metadataByFloorId.values()].sort((left, right) =>
      left.floorId.localeCompare(right.floorId),
    ),
  };

  return {
    graph: {
      nodes: graph.nodes,
      edges: calibratedEdges,
      distanceCalibration,
    },
    errors: [],
  };
}
