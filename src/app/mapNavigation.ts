import type { Place } from "../data/types";
import { findShortestRouteBetweenPlaces } from "../features/routing/findShortestRoute";
import { routeGraph } from "../features/routing/routeGraph";
import {
  createRoutePresentation,
  type RoutePresentation,
} from "../features/routing/routePresentation";

export type MapNavigationPresentation = {
  mapFocusPlace: Place | null;
  routePresentation: RoutePresentation;
};

type MapNavigationInput = {
  requestedFocusPlace: Place | null;
  focusPlace: Place | null;
  currentPlace: Place | null;
  destinationPlace: Place | null;
};

function isRoutablePlace(place: Place | null): place is Place {
  return place !== null && place.mapping !== "unmapped";
}

/**
 * URL state and transient navigation stateから、地図の初期表示を導出する。
 * ルート開始時は目的地ではなく現在地を優先し、直接URLを開いた場合も
 * 「ここへ行く」やQR解決後と同じ地図フロア・フォーカスになるようにする。
 */
export function createMapNavigationPresentation({
  requestedFocusPlace,
  focusPlace,
  currentPlace,
  destinationPlace,
}: MapNavigationInput): MapNavigationPresentation {
  const routableCurrentPlace = isRoutablePlace(currentPlace)
    ? currentPlace
    : null;
  const routableDestinationPlace = isRoutablePlace(destinationPlace)
    ? destinationPlace
    : null;
  const routeEdges =
    routableCurrentPlace && routableDestinationPlace
      ? (findShortestRouteBetweenPlaces(
          routeGraph,
          routableCurrentPlace.id,
          routableDestinationPlace.id,
        ) ?? [])
      : [];

  const mapFocusPlace =
    requestedFocusPlace ??
    focusPlace ??
    (routableCurrentPlace && routableDestinationPlace
      ? routableCurrentPlace
      : destinationPlace ?? currentPlace);

  return {
    mapFocusPlace,
    routePresentation: createRoutePresentation(routeEdges, routeGraph.nodes),
  };
}
