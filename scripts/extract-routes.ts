import * as fs from "fs";
import * as path from "path";
import { floors, mapSheets, places } from "../src/data/places.js";
import {
  extractRouteGraph,
  serializeRouteGraph,
  type RouteSvgSource,
} from "./routeExtractionCore.js";
import { routeDistanceCalibrationPlan } from "./routeDistanceCalibration.js";

const repositoryRoot = path.join(import.meta.dirname, "..");
const outputPath = path.join(
  repositoryRoot,
  "src",
  "features",
  "routing",
  "generated",
  "routeGraph.json",
);
const checkOnly = process.argv.includes("--check");
const sources: RouteSvgSource[] = mapSheets.map((sheet) => ({
  svgUrl: sheet.svgUrl,
  content: fs.readFileSync(
    path.join(repositoryRoot, "public", sheet.svgUrl.replace(/^\//, "")),
    "utf8",
  ),
}));
const result = await extractRouteGraph({
  sources,
  mapSheets,
  floors,
  places,
  distanceCalibrationPlan: routeDistanceCalibrationPlan,
});

if (result.errors.length > 0) {
  console.error("Routeグラフの抽出に失敗しました:");
  for (const error of result.errors) {
    console.error(`  - ${error}`);
  }
  process.exit(1);
}

const serializedGraph = serializeRouteGraph(result.graph);

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
  console.log(
    `✓ Routeグラフ検証成功: ${result.graph.nodes.length}ノード / ${result.graph.edges.length}エッジ`,
  );
  process.exit(0);
}

await Bun.write(outputPath, serializedGraph);
console.log(
  `✓ Routeグラフを生成しました: ${result.graph.nodes.length}ノード / ${result.graph.edges.length}エッジ`,
);
