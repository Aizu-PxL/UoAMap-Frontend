import type { RouteGraph } from "../../data/types";
import generatedRouteGraph from "./generated/routeGraph.json";

/**
 * scripts/extract-routes.ts がSVGから生成する静的グラフ。
 * generate/verify時に参照整合性と形状を検証済み。
 */
export const routeGraph = generatedRouteGraph as RouteGraph;
