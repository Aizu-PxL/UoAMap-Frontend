import * as fs from "fs";
import * as path from "path";
import { floors, getPlace, mapSheets } from "../src/data/places.js";
import type { RouteEdge, RouteGraph, RouteNode, RouteNodeKind } from "../src/data/types.js";

type SourceNode = Omit<RouteNode, "id" | "floorId"> & {
  localId: string;
};

type SourceEdge = {
  localId: string;
  nodeA: string;
  nodeB: string;
  pathD: string;
};

const outputPath = path.join(
  import.meta.dirname,
  "..",
  "src",
  "features",
  "routing",
  "generated",
  "routeGraph.json",
);
const checkOnly = process.argv.includes("--check");
const routeKinds = new Set<RouteNodeKind>(["corridor", "stairs", "entrance"]);
const routeIdPattern = /^[A-Za-z][A-Za-z0-9_-]*$/;
const numberPattern = "-?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][+-]?\\d+)?";
const straightPathPattern = new RegExp(
  `^\\s*M\\s*(${numberPattern})[\\s,]+(${numberPattern})\\s*L\\s*(${numberPattern})[\\s,]+(${numberPattern})\\s*$`,
);
const errors: string[] = [];
const nodes: RouteNode[] = [];
const edges: RouteEdge[] = [];
const globalNodeIds = new Set<string>();
const globalEdgeIds = new Set<string>();

for (const sheet of mapSheets) {
  const svgFilePath = path.join(
    import.meta.dirname,
    "..",
    "public",
    sheet.svgUrl.replace(/^\//, ""),
  );
  const svgContent = fs.readFileSync(svgFilePath, "utf8");
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
        const rawKind = element.getAttribute("data-kind");
        const rawX = element.getAttribute("cx");
        const rawY = element.getAttribute("cy");
        const x = rawX === null || rawX.trim() === "" ? Number.NaN : Number(rawX);
        const y = rawY === null || rawY.trim() === "" ? Number.NaN : Number(rawY);

        if (element.tagName !== "circle") {
          errors.push(`${sheet.svgUrl}: Routeノードはcircleである必要があります`);
          return;
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
          x,
          y,
          kind: rawKind as RouteNodeKind,
          ...(placeId ? { placeId } : {}),
        });
      },
    })
    .on("g#Route [data-route-edge]", {
      element(element) {
        const localId = element.getAttribute("id");
        const nodeA = element.getAttribute("data-node-a");
        const nodeB = element.getAttribute("data-node-b");
        const pathD = element.getAttribute("d");

        if (element.tagName !== "path") {
          errors.push(`${sheet.svgUrl}: Routeエッジはpathである必要があります`);
          return;
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
        sourceEdges.push({ localId, nodeA, nodeB, pathD });
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
    errors.push(`${sheet.svgUrl}: Routeにdata-floor-idがありません`);
    continue;
  }

  const floor = floors.find((candidate) => candidate.id === routeFloorId);
  if (!floor || floor.sheetId !== sheet.id) {
    errors.push(`${sheet.svgUrl}: data-floor-id="${routeFloorId}" がシートと一致しません`);
    continue;
  }
  for (const elementId of transformedElements) {
    errors.push(`${sheet.svgUrl}: Route内の ${elementId} にtransformは使用できません`);
  }

  const localNodeIds = new Set<string>();
  const placeIds = new Set<string>();
  for (const sourceNode of sourceNodes) {
    if (localNodeIds.has(sourceNode.localId)) {
      errors.push(`${sheet.svgUrl}: RouteノードID ${sourceNode.localId} が重複しています`);
      continue;
    }
    localNodeIds.add(sourceNode.localId);

    if (sourceNode.placeId) {
      const place = getPlace(sourceNode.placeId);
      if (!place) {
        errors.push(`${sheet.svgUrl}: 未登録Place ${sourceNode.placeId} を参照しています`);
      } else if (place.floorId !== routeFloorId) {
        errors.push(
          `${sheet.svgUrl}: Place ${sourceNode.placeId} は ${routeFloorId} に属していません`,
        );
      }
      if (placeIds.has(sourceNode.placeId)) {
        errors.push(`${sheet.svgUrl}: Place ${sourceNode.placeId} のノードが重複しています`);
      }
      placeIds.add(sourceNode.placeId);
    }

    const id = `${routeFloorId}:${sourceNode.localId}`;
    if (globalNodeIds.has(id)) {
      errors.push(`経路ノードID ${id} が重複しています`);
    }
    globalNodeIds.add(id);
    nodes.push({
      id,
      floorId: routeFloorId,
      x: sourceNode.x,
      y: sourceNode.y,
      kind: sourceNode.kind,
      ...(sourceNode.placeId ? { placeId: sourceNode.placeId } : {}),
    });
  }

  const localEdgeIds = new Set<string>();
  const sourceNodeById = new Map(sourceNodes.map((node) => [node.localId, node]));
  for (const sourceEdge of sourceEdges) {
    if (localEdgeIds.has(sourceEdge.localId)) {
      errors.push(`${sheet.svgUrl}: RouteエッジID ${sourceEdge.localId} が重複しています`);
      continue;
    }
    localEdgeIds.add(sourceEdge.localId);

    const nodeA = sourceNodeById.get(sourceEdge.nodeA);
    const nodeB = sourceNodeById.get(sourceEdge.nodeB);
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

    const id = `${routeFloorId}:${sourceEdge.localId}`;
    if (globalEdgeIds.has(id)) {
      errors.push(`経路エッジID ${id} が重複しています`);
    }
    globalEdgeIds.add(id);
    edges.push({
      id,
      floorId: routeFloorId,
      nodeA: `${routeFloorId}:${sourceEdge.nodeA}`,
      nodeB: `${routeFloorId}:${sourceEdge.nodeB}`,
      distance: Math.hypot(nodeB.x - nodeA.x, nodeB.y - nodeA.y),
      pathD: sourceEdge.pathD,
    });
  }
}

nodes.sort((a, b) => a.id.localeCompare(b.id));
edges.sort((a, b) => a.id.localeCompare(b.id));

if (errors.length > 0) {
  console.error("Routeグラフの抽出に失敗しました:");
  for (const error of errors) {
    console.error(`  - ${error}`);
  }
  process.exit(1);
}

const graph: RouteGraph = { nodes, edges };
const serializedGraph = `${JSON.stringify(graph, null, 2)}\n`;

if (checkOnly) {
  if (!fs.existsSync(outputPath)) {
    console.error("RouteグラフJSONがありません。bun run generate:routes を実行してください");
    process.exit(1);
  }
  const currentGraph = fs.readFileSync(outputPath, "utf8");
  if (currentGraph !== serializedGraph) {
    console.error(
      "RouteグラフJSONがSVGと一致しません。bun run generate:routes を実行してください",
    );
    process.exit(1);
  }
  console.log(`✓ Routeグラフ検証成功: ${nodes.length}ノード / ${edges.length}エッジ`);
  process.exit(0);
}

await Bun.write(outputPath, serializedGraph);
console.log(`✓ Routeグラフを生成しました: ${nodes.length}ノード / ${edges.length}エッジ`);

function samePoint(
  left: { x: number; y: number },
  right: { x: number; y: number },
) {
  return Math.abs(left.x - right.x) < 0.001 && Math.abs(left.y - right.y) < 0.001;
}
