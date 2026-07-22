import {
  routeEditorRuntimeConfig,
  type RouteEditorRuntimeConfig,
} from "./config.js";
import { routeEditorPlanIo, type RouteEditorPlanIo } from "./planIo.js";
import {
  routeEditorHistory,
  type RouteEditorHistory,
} from "./history.js";
import {
  routeEditorRouteXml,
  type RouteEditorRouteXml,
} from "./routeXml.js";

declare global {
  var UOAMAP_ROUTE_EDITOR_CONFIG: RouteEditorRuntimeConfig | undefined;
  var UOAMAP_ROUTE_EDITOR_PLAN_IO: RouteEditorPlanIo | undefined;
  var UOAMAP_ROUTE_EDITOR_HISTORY: RouteEditorHistory | undefined;
  var UOAMAP_ROUTE_EDITOR_ROUTE_XML: RouteEditorRouteXml | undefined;
}

globalThis.UOAMAP_ROUTE_EDITOR_CONFIG = routeEditorRuntimeConfig;
globalThis.UOAMAP_ROUTE_EDITOR_PLAN_IO = routeEditorPlanIo;
globalThis.UOAMAP_ROUTE_EDITOR_HISTORY = routeEditorHistory;
globalThis.UOAMAP_ROUTE_EDITOR_ROUTE_XML = routeEditorRouteXml;
