import {
  routeEditorRuntimeConfig,
  type RouteEditorRuntimeConfig,
} from "./config.js";

declare global {
  var UOAMAP_ROUTE_EDITOR_CONFIG: RouteEditorRuntimeConfig | undefined;
}

globalThis.UOAMAP_ROUTE_EDITOR_CONFIG = routeEditorRuntimeConfig;
