import type {
  Floor,
  MapSheet,
  Place,
  RouteEdge,
  RouteGraph,
  RouteNode,
  RouteNodeKind,
} from "../src/data/types.js";
import {
  calibrateRouteGraphDistances,
  type RouteDistanceCalibrationPlan,
} from "./routeDistanceCalibration.js";

type SourceNode = Omit<RouteNode, "id" | "floorId"> & {
  localId: string;
  floorId: string;
  stairId?: string;
  entranceId?: string;
};

type SourceEdge = {
  localId: string;
  floorId: string;
  nodeA: string;
  nodeB: string;
  pathD: string;
};

export type RouteSvgSource = {
  svgUrl: string;
  content: string;
};

export type RouteExtractionInput = {
  sources: readonly RouteSvgSource[];
  mapSheets: readonly MapSheet[];
  floors: readonly Floor[];
  places: readonly Place[];
  distanceCalibrationPlan?: RouteDistanceCalibrationPlan;
};

export type RouteExtractionResult = {
  graph: RouteGraph;
  errors: string[];
};

const routeKinds = new Set<RouteNodeKind>(["corridor", "stairs", "entrance"]);
const routeIdPattern = /^[A-Za-z][A-Za-z0-9_-]*$/;
const stairIdPattern = /^[A-Za-z0-9_-]+$/;
const entranceIdPattern = /^[A-Za-z0-9_-]+$/;
const stairTransferDistance = 60;
const entranceTransferDistance = 0;
const numberPattern = "-?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][+-]?\\d+)?";
const straightPathPattern = new RegExp(
  `^\\s*M\\s*(${numberPattern})[\\s,]+(${numberPattern})\\s*L\\s*(${numberPattern})[\\s,]+(${numberPattern})\\s*$`,
);

export async function extractRouteGraph({
  sources,
  mapSheets,
  floors,
  places,
  distanceCalibrationPlan,
}: RouteExtractionInput): Promise<RouteExtractionResult> {
  const errors: string[] = [];
  const nodes: RouteNode[] = [];
  const edges: RouteEdge[] = [];
  const globalNodeIds = new Set<string>();
  const globalEdgeIds = new Set<string>();
  const globalPlaceNodeIds = new Map<string, string>();
  const stairOccurrences = new Map<
    string,
    Array<{ floorId: string; floorIndex: number; nodeId: string }>
  >();
  const entranceOccurrences = new Map<
    string,
    Array<{ floorId: string; nodeId: string }>
  >();
  const sourceBySvgUrl = new Map(
    sources.map((source) => [source.svgUrl, source.content]),
  );
  const placeById = new Map(places.map((place) => [place.id, place]));

for (const sheet of mapSheets) {
  const sheetFloors = floors.filter((floor) => floor.sheetId === sheet.id);
  if (sheetFloors.length !== 1) {
    errors.push(
      `${sheet.svgUrl}: MapSheetにはFloorを1つだけ登録してください（現在${sheetFloors.length}件）`,
    );
    continue;
  }
  const sheetFloor = sheetFloors[0];
  const svgContent = sourceBySvgUrl.get(sheet.svgUrl);
  if (svgContent === undefined) {
    errors.push(`${sheet.svgUrl}: SVG sourceがありません`);
    continue;
  }
  let routeGroupCount = 0;
  let rootRouteGroupCount = 0;
  let routeFloorId: string | null = null;
  const sourceNodes: SourceNode[] = [];
  const sourceEdges: SourceEdge[] = [];
  const transformedElements: string[] = [];

  await new HTMLRewriter()
    .on("g#Route", {
      element() {
        routeGroupCount += 1;
      },
    })
    .on("svg > g#Route", {
      element(element) {
        rootRouteGroupCount += 1;
        routeFloorId = element.getAttribute("data-floor-id");
        if (element.getAttribute("transform") !== null) {
          transformedElements.push("Route");
        }
      },
    })
    .on("g#Route [transform]", {
      element(element) {
        transformedElements.push(element.getAttribute("id") ?? element.tagName);
      },
    })
    .on("g#Route [data-route-node]", {
      element(element) {
        const localId = element.getAttribute("id");
        const floorId = sheetFloor.id;
        const rawKind = element.getAttribute("data-kind");
        const rawX = element.getAttribute("cx");
        const rawY = element.getAttribute("cy");
        const rawStairId = element.getAttribute("data-stair-id");
        const rawEntranceId = element.getAttribute("data-entrance-id");
        const x = rawX === null || rawX.trim() === "" ? Number.NaN : Number(rawX);
        const y = rawY === null || rawY.trim() === "" ? Number.NaN : Number(rawY);

        if (element.tagName !== "circle") {
          errors.push(`${sheet.svgUrl}: Routeノードはcircleである必要があります`);
          return;
        }
        if (element.getAttribute("data-floor-id") !== null) {
          errors.push(
            `${sheet.svgUrl}: ${localId ?? "Routeノード"}のdata-floor-idはRouteグループへ設定してください`,
          );
        }
        if (!localId) {
          errors.push(`${sheet.svgUrl}: IDのないRouteノードがあります`);
          return;
        }
        if (!routeIdPattern.test(localId)) {
          errors.push(`${sheet.svgUrl}: RouteノードID ${localId} に使用できない文字があります`);
          return;
        }
        if (!rawKind || !routeKinds.has(rawKind as RouteNodeKind)) {
          errors.push(`${sheet.svgUrl}: ${localId} のdata-kindが不正です`);
          return;
        }
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
          errors.push(`${sheet.svgUrl}: ${localId} のcx/cyが不正です`);
          return;
        }

        const placeId = element.getAttribute("data-place-id") ?? undefined;
        sourceNodes.push({
          localId,
          floorId,
          x,
          y,
          kind: rawKind as RouteNodeKind,
          ...(placeId ? { placeId } : {}),
          ...(rawStairId !== null ? { stairId: rawStairId } : {}),
          ...(rawEntranceId !== null ? { entranceId: rawEntranceId } : {}),
        });
      },
    })
    .on("g#Route [data-stair-id]", {
      element(element) {
        const localId = element.getAttribute("id") ?? element.tagName;
        const stairId = element.getAttribute("data-stair-id") ?? "";
        if (
          element.tagName !== "circle" ||
          !element.hasAttribute("data-route-node") ||
          element.getAttribute("data-kind") !== "stairs"
        ) {
          errors.push(
            `${sheet.svgUrl}: ${localId} のdata-stair-idはstairsノードにのみ付けられます`,
          );
        }
        if (!stairIdPattern.test(stairId)) {
          errors.push(`${sheet.svgUrl}: ${localId} のdata-stair-idが不正です`);
        }
      },
    })
    .on("g#Route [data-entrance-id]", {
      element(element) {
        const localId = element.getAttribute("id") ?? element.tagName;
        const entranceId = element.getAttribute("data-entrance-id") ?? "";
        if (
          element.tagName !== "circle" ||
          !element.hasAttribute("data-route-node") ||
          element.getAttribute("data-kind") !== "entrance"
        ) {
          errors.push(
            `${sheet.svgUrl}: ${localId} のdata-entrance-idはentranceノードにのみ付けられます`,
          );
        }
        if (!entranceIdPattern.test(entranceId)) {
          errors.push(`${sheet.svgUrl}: ${localId} のdata-entrance-idが不正です`);
        }
      },
    })
    .on("g#Route [data-route-edge]", {
      element(element) {
        const localId = element.getAttribute("id");
        const floorId = sheetFloor.id;
        const nodeA = element.getAttribute("data-node-a");
        const nodeB = element.getAttribute("data-node-b");
        const pathD = element.getAttribute("d");

        if (element.tagName !== "path") {
          errors.push(`${sheet.svgUrl}: Routeエッジはpathである必要があります`);
          return;
        }
        if (element.getAttribute("data-floor-id") !== null) {
          errors.push(
            `${sheet.svgUrl}: ${localId ?? "Routeエッジ"}のdata-floor-idはRouteグループへ設定してください`,
          );
        }
        if (!localId || !nodeA || !nodeB || !pathD) {
          errors.push(`${sheet.svgUrl}: Routeエッジの必須属性が不足しています`);
          return;
        }
        if (
          !routeIdPattern.test(localId) ||
          !routeIdPattern.test(nodeA) ||
          !routeIdPattern.test(nodeB)
        ) {
          errors.push(`${sheet.svgUrl}: Routeエッジ ${localId} のID属性が不正です`);
          return;
        }
        sourceEdges.push({ localId, floorId, nodeA, nodeB, pathD });
      },
    })
    .transform(new Response(svgContent))
    .text();

  if (routeGroupCount === 0) {
    continue;
  }
  if (routeGroupCount !== 1) {
    errors.push(`${sheet.svgUrl}: Routeグループは1つだけ配置してください`);
    continue;
  }
  if (rootRouteGroupCount !== 1) {
    errors.push(`${sheet.svgUrl}: RouteグループはSVGルート直下に配置してください`);
    continue;
  }
  if (!routeFloorId) {
    errors.push(`${sheet.svgUrl}: Routeグループにdata-floor-idがありません`);
    continue;
  }
  if (routeFloorId !== sheetFloor.id) {
    errors.push(
      `${sheet.svgUrl}: data-floor-id="${routeFloorId}" がFloor ${sheetFloor.id} と一致しません`,
    );
    continue;
  }
  for (const elementId of transformedElements) {
    errors.push(`${sheet.svgUrl}: Route内の ${elementId} にtransformは使用できません`);
  }

  const localNodeIds = new Set<string>();
  const stairIds = new Set<string>();
  const entranceIds = new Set<string>();
  for (const sourceNode of sourceNodes) {
    const localNodeKey = `${sourceNode.floorId}:${sourceNode.localId}`;
    if (localNodeIds.has(sourceNode.localId)) {
      errors.push(
        `${sheet.svgUrl}: RouteノードID ${sourceNode.localId} がSVG内で重複しています`,
      );
      continue;
    }
    localNodeIds.add(sourceNode.localId);

    if (sourceNode.placeId) {
      const place = placeById.get(sourceNode.placeId);
      if (!place) {
        errors.push(`${sheet.svgUrl}: 未登録Place ${sourceNode.placeId} を参照しています`);
      } else if (place.floorId !== sourceNode.floorId) {
        errors.push(
          `${sheet.svgUrl}: Place ${sourceNode.placeId} は ${sourceNode.floorId} に属していません`,
        );
      }
      const existingNodeId = globalPlaceNodeIds.get(sourceNode.placeId);
      if (existingNodeId) {
        errors.push(
          `${sheet.svgUrl}: Place ${sourceNode.placeId} のノードが ${existingNodeId} と重複しています`,
        );
      } else {
        globalPlaceNodeIds.set(sourceNode.placeId, localNodeKey);
      }
    }

    const id = localNodeKey;
    if (globalNodeIds.has(id)) {
      errors.push(`経路ノードID ${id} が重複しています`);
    }
    globalNodeIds.add(id);
    nodes.push({
      id,
      floorId: sourceNode.floorId,
      x: sourceNode.x,
      y: sourceNode.y,
      kind: sourceNode.kind,
      ...(sourceNode.placeId ? { placeId: sourceNode.placeId } : {}),
    });

    if (
      sourceNode.stairId !== undefined &&
      sourceNode.kind === "stairs" &&
      stairIdPattern.test(sourceNode.stairId)
    ) {
      const stairKey = `${sourceNode.floorId}:${sourceNode.stairId}`;
      if (stairIds.has(stairKey)) {
        errors.push(
          `${sheet.svgUrl}: data-stair-id ${sourceNode.stairId} が同一フロア内で重複しています`,
        );
      } else {
        stairIds.add(stairKey);
        const floor = floors.find((candidate) => candidate.id === sourceNode.floorId);
        if (!floor) {
          continue;
        }
        const occurrences = stairOccurrences.get(sourceNode.stairId) ?? [];
        occurrences.push({
          floorId: sourceNode.floorId,
          floorIndex: floors.indexOf(floor),
          nodeId: id,
        });
        stairOccurrences.set(sourceNode.stairId, occurrences);
      }
    }

    if (
      sourceNode.entranceId !== undefined &&
      sourceNode.kind === "entrance" &&
      entranceIdPattern.test(sourceNode.entranceId)
    ) {
      const entranceKey = `${sourceNode.floorId}:${sourceNode.entranceId}`;
      if (entranceIds.has(entranceKey)) {
        errors.push(
          `${sheet.svgUrl}: data-entrance-id ${sourceNode.entranceId} が同一フロア内で重複しています`,
        );
      } else {
        entranceIds.add(entranceKey);
        const occurrences = entranceOccurrences.get(sourceNode.entranceId) ?? [];
        occurrences.push({
          floorId: sourceNode.floorId,
          nodeId: id,
        });
        entranceOccurrences.set(sourceNode.entranceId, occurrences);
      }
    }
  }

  const localEdgeIds = new Set<string>();
  const sourceNodeById = new Map(
    sourceNodes.map((node) => [`${node.floorId}:${node.localId}`, node]),
  );
  for (const sourceEdge of sourceEdges) {
    const localEdgeKey = `${sourceEdge.floorId}:${sourceEdge.localId}`;
    if (localEdgeIds.has(sourceEdge.localId)) {
      errors.push(
        `${sheet.svgUrl}: RouteエッジID ${sourceEdge.localId} がSVG内で重複しています`,
      );
      continue;
    }
    localEdgeIds.add(sourceEdge.localId);

    const nodeA = sourceNodeById.get(`${sourceEdge.floorId}:${sourceEdge.nodeA}`);
    const nodeB = sourceNodeById.get(`${sourceEdge.floorId}:${sourceEdge.nodeB}`);
    if (!nodeA || !nodeB) {
      errors.push(
        `${sheet.svgUrl}: ${sourceEdge.localId} が未定義ノードを参照しています`,
      );
      continue;
    }

    const pathMatch = straightPathPattern.exec(sourceEdge.pathD);
    if (!pathMatch) {
      errors.push(
        `${sheet.svgUrl}: ${sourceEdge.localId} は絶対座標の直線pathではありません`,
      );
      continue;
    }
    const [, rawX1, rawY1, rawX2, rawY2] = pathMatch;
    const pathStart = { x: Number(rawX1), y: Number(rawY1) };
    const pathEnd = { x: Number(rawX2), y: Number(rawY2) };
    if (
      !samePoint(pathStart, nodeA) ||
      !samePoint(pathEnd, nodeB)
    ) {
      errors.push(
        `${sheet.svgUrl}: ${sourceEdge.localId} の始終点が参照ノード座標と一致しません`,
      );
      continue;
    }

    const id = localEdgeKey;
    if (globalEdgeIds.has(id)) {
      errors.push(`経路エッジID ${id} が重複しています`);
    }
    globalEdgeIds.add(id);
    edges.push({
      id,
      kind: "walk",
      floorId: sourceEdge.floorId,
      nodeA: `${sourceEdge.floorId}:${sourceEdge.nodeA}`,
      nodeB: `${sourceEdge.floorId}:${sourceEdge.nodeB}`,
      distance: Math.hypot(nodeB.x - nodeA.x, nodeB.y - nodeA.y),
      pathD: sourceEdge.pathD,
    });
  }
}

for (const [stairId, unsortedOccurrences] of stairOccurrences) {
  const occurrences = [...unsortedOccurrences].sort(
    (left, right) => left.floorIndex - right.floorIndex,
  );
  if (occurrences.length < 2) {
    errors.push(`data-stair-id ${stairId} は2フロア以上に配置してください`);
    continue;
  }

  let isContiguous = true;
  for (let index = 1; index < occurrences.length; index += 1) {
    const previous = occurrences[index - 1];
    const current = occurrences[index];
    if (current.floorIndex !== previous.floorIndex + 1) {
      isContiguous = false;
      break;
    }
  }
  if (!isContiguous) {
    errors.push(
      `data-stair-id ${stairId} のフロアはfloors配列順で連続している必要があります`,
    );
    continue;
  }

  for (let index = 1; index < occurrences.length; index += 1) {
    const floorA = occurrences[index - 1];
    const floorB = occurrences[index];
    const id = `transfer:${stairId}:${floorA.floorId}:${floorB.floorId}`;
    if (globalEdgeIds.has(id)) {
      errors.push(`経路エッジID ${id} が重複しています`);
      continue;
    }
    globalEdgeIds.add(id);
    edges.push({
      id,
      kind: "transfer",
      nodeA: floorA.nodeId,
      nodeB: floorB.nodeId,
      distance: stairTransferDistance,
    });
  }
}

for (const [entranceId, occurrences] of entranceOccurrences) {
  if (occurrences.length !== 2) {
    errors.push(`data-entrance-id ${entranceId} は2ノードに配置してください`);
    continue;
  }

  const campusOccurrences = occurrences.filter(
    (occurrence) => occurrence.floorId === "campus",
  );
  const buildingOccurrences = occurrences.filter(
    (occurrence) => occurrence.floorId !== "campus",
  );
  if (campusOccurrences.length !== 1 || buildingOccurrences.length !== 1) {
    errors.push(
      `data-entrance-id ${entranceId} はcampus側1ノードと建物側1ノードに配置してください`,
    );
    continue;
  }

  const campus = campusOccurrences[0];
  const building = buildingOccurrences[0];
  const id = `transfer:entrance:${entranceId}:campus:${building.floorId}`;
  if (globalEdgeIds.has(id)) {
    errors.push(`経路エッジID ${id} が重複しています`);
    continue;
  }
  globalEdgeIds.add(id);
  edges.push({
    id,
    kind: "transfer",
    nodeA: campus.nodeId,
    nodeB: building.nodeId,
    distance: entranceTransferDistance,
  });
}

nodes.sort((a, b) => a.id.localeCompare(b.id));
edges.sort((a, b) => a.id.localeCompare(b.id));

  const graph = { nodes, edges };
  if (distanceCalibrationPlan && errors.length === 0) {
    const calibrated = calibrateRouteGraphDistances(
      graph,
      distanceCalibrationPlan,
    );
    errors.push(...calibrated.errors);
    return { graph: calibrated.graph, errors };
  }

  return {
    graph,
    errors,
  };
}

export function serializeRouteGraph(graph: RouteGraph): string {
  return `${JSON.stringify(graph, null, 2)}\n`;
}

function samePoint(
  left: { x: number; y: number },
  right: { x: number; y: number },
) {
  return Math.abs(left.x - right.x) < 0.001 && Math.abs(left.y - right.y) < 0.001;
}
