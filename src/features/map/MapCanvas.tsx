import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import stairsArrowDownUrl from "../../assets/stairs_arrow_down.svg";
import stairsArrowUpUrl from "../../assets/stairs_arrow_up.svg";
import { getEventDetailPath } from "../../app/navigationSearch";
import type { BottomSheetSnapPoint } from "../../components/bottom-sheet/bottomSheetGeometry";
import { floors, getPlace, mapSheets } from "../../data/places";
import type { Event as CampusEvent, Place } from "../../data/types";
import type { RoutePresentation } from "../routing/routePresentation";
import { extractMapLabels, renderMapLabels } from "./mapLabels";
import type { MapLabel } from "./mapLabels";
import {
  getAnchoredOverlayBounds,
  getAnchoredOverlayTransform,
} from "./mapOverlayGeometry";
import type { OverlayBounds } from "./mapOverlayGeometry";
import {
  createMapMarkerPresentation,
  EVENT_MARKER_LOCAL_ANCHOR,
  EVENT_MARKER_RADIUS,
  EVENT_MARKER_SIZE,
  getEventCountWidth,
  getNextEventSelectionChangeTimestamp,
  selectUpcomingEvent,
  type EventMarkerPlacement,
  type MapMarkerPlacement,
} from "./mapMarkerPresentation";
import { createMapOverlayLayout } from "./mapOverlayLayout";
import { getMapOverlayRedrawKey } from "./mapOverlayRedraw";
import { exceedsMapTapMovement } from "./mapGesture";
import {
  DEFAULT_FLOOR_ID,
  isSameBuilding,
} from "./mapFloorNavigation";
import {
  focusMapViewBox,
  getProportionalMapViewBox,
  panMapViewBox,
  parseMapViewBox,
  serializeMapViewBox,
  zoomMapViewBoxAt,
} from "./mapViewBox";
import type { MapViewBox } from "./mapViewBox";
import { getMeetUserUnitsPerPixel } from "./mapViewportScale";
import {
  getPlaceCoordinates,
  getSvgElementBounds,
  getSvgElementCoordinates,
} from "./placeLocator";

interface MapCanvasProps {
  floorId?: string;
  onFloorChange: (floorId: string) => void;
  currentPlace: Place | null;
  destinationPlace: Place | null;
  mapFocusPlace: Place | null;
  focusPlace: Place | null;
  focusRequestNonce: number;
  events: CampusEvent[];
  routePresentation: RoutePresentation;
  onRequestBottomSheetSnap: (snapPoint: BottomSheetSnapPoint) => void;
}

const DEFAULT_VIEW_BOX: MapViewBox = {
  x: 0,
  y: 0,
  width: 1000,
  height: 1000,
};

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const FOCUS_VIEW_BOX_RATIO = 0.4;
const FOCUS_VERTICAL_ANCHOR = 0.5;
const PIN_PATH =
  "M25 45.83c-5.59-4.76-9.77-9.17-12.53-13.25-2.76-4.08-4.14-7.86-4.14-11.33 0-5.21 1.68-9.36 5.03-12.45C16.71 5.71 20.59 4.17 25 4.17s8.29 1.55 11.64 4.64c3.35 3.09 5.03 7.24 5.03 12.45 0 3.47-1.38 7.25-4.14 11.33-2.76 4.08-6.94 8.49-12.53 13.25Z";
const LOCATION_DETAIL_PATH = "M25 27.08a5.83 5.83 0 1 0 0-11.66 5.83 5.83 0 0 0 0 11.66Z";
const PERSON_DETAIL_PATH =
  "M25 20.42a4.17 4.17 0 1 0 0-8.34 4.17 4.17 0 0 0 0 8.34Zm-7.29 10.41h14.58v-2.08c0-3.47-3.24-6.25-7.29-6.25s-7.29 2.78-7.29 6.25v2.08Z";
const PIN_LOCAL_ANCHOR = { x: 25, y: 45.83 };
const MARKER_COLLISION_PADDING_PX = 2;
const EVENT_MARKER_PERSON_PATH =
  "M12 10.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6.75 18h10.5v-1.5c0-2.5-2.33-4.5-5.25-4.5s-5.25 2-5.25 4.5V18Z";
const ROUTE_TRANSFER_MARKER_RADIUS = 7;
const ROUTE_STAIR_BADGE_RADIUS = 16;
const ROUTE_STAIR_ICON_SIZE = 24;
const buildingFloorIds = {
  building_ResearchQuad: "rq-1f",
  building_StudentHall: "sh-1f",
  building_LecHall: "lh-1f",
  building_UBIC: "ubic-1f",
  building_LICTiA: "lictia-1f",
} as const;

const buildingLabels: Record<keyof typeof buildingFloorIds, string> = {
  building_ResearchQuad: "研究棟を表示",
  building_StudentHall: "学生ホールを表示",
  building_LecHall: "講義棟を表示",
  building_UBIC: "UBICを表示",
  building_LICTiA: "LICTiAを表示",
};

function getPinExclusionBounds(
  marker: MapMarkerPlacement,
  userUnitsPerPixel: number,
): OverlayBounds {
  return getAnchoredOverlayBounds(
    { left: 0, top: 0, right: 50, bottom: 45.83 },
    marker.coordinates,
    userUnitsPerPixel,
    PIN_LOCAL_ANCHOR,
    MARKER_COLLISION_PADDING_PX,
  );
}

interface OverlayLayoutInput {
  svgElement: SVGSVGElement;
  userUnitsPerPixel: number;
  mapLabels: MapLabel[];
  floorId: string;
  events: CampusEvent[];
  currentPlace: Place | null;
  destinationPlace: Place | null;
  focusPlace: Place | null;
}

// ラベルレイヤーとマーカーレイヤーは同じレイアウト結果を使う必要があるため、
// マーカー生成からラベルカリングまでを1箇所にまとめる。
function buildMapOverlayLayout({
  svgElement,
  userUnitsPerPixel,
  mapLabels,
  floorId,
  events,
  currentPlace,
  destinationPlace,
  focusPlace,
}: OverlayLayoutInput) {
  const markers = createMapMarkerPresentation({
    currentPlace,
    destinationPlace,
    events,
    floorId,
    focusPlace,
    resolveCoordinates: (target) => {
      if (target.kind === "place") {
        return getPlaceCoordinates(target.place, svgElement);
      }
      if (target.kind === "route-node") {
        return { x: target.node.x, y: target.node.y };
      }
      return getSvgElementCoordinates(target.elementId, svgElement);
    },
    resolveFloorSheetId: (targetFloorId) =>
      floors.find((candidate) => candidate.id === targetFloorId)?.sheetId ?? null,
    resolvePlace: (placeId) => getPlace(placeId) ?? null,
  });

  return createMapOverlayLayout({
    mapLabels,
    markers,
    userUnitsPerPixel,
    isCampusOverview: floorId === DEFAULT_FLOOR_ID,
    getPinExclusionBounds: (marker) => getPinExclusionBounds(marker, userUnitsPerPixel),
    resolveElementBounds: (elementId) => getSvgElementBounds(elementId, svgElement),
    resolvePlaceBounds: (placeId) => {
      const place = getPlace(placeId);
      return place?.mapping === "svg"
        ? getSvgElementBounds(place.svgElementId, svgElement)
        : null;
    },
  });
}

const svgTextCache = new Map<string, Promise<string>>();

function fetchSvg(svgUrl: string) {
  const cachedSvg = svgTextCache.get(svgUrl);
  if (cachedSvg) {
    return cachedSvg;
  }

  const svgRequest = fetch(svgUrl)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.text();
    })
    .catch((error) => {
      svgTextCache.delete(svgUrl);
      throw error;
    });

  svgTextCache.set(svgUrl, svgRequest);
  return svgRequest;
}

function screenPointToSvg(
  svgElement: SVGSVGElement,
  clientX: number,
  clientY: number,
) {
  const screenMatrix = svgElement.getScreenCTM();
  if (!screenMatrix) {
    return null;
  }

  const point = new DOMPoint(clientX, clientY).matrixTransform(screenMatrix.inverse());
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    return null;
  }

  return { x: point.x, y: point.y };
}

function screenPointToSvgWithMatrix(
  inverseScreenMatrix: DOMMatrix,
  clientX: number,
  clientY: number,
) {
  const point = new DOMPoint(clientX, clientY).matrixTransform(inverseScreenMatrix);
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    return null;
  }

  return { x: point.x, y: point.y };
}

export function MapCanvas({
  floorId = DEFAULT_FLOOR_ID,
  onFloorChange,
  currentPlace,
  destinationPlace,
  mapFocusPlace,
  focusPlace,
  focusRequestNonce,
  events,
  routePresentation,
  onRequestBottomSheetSnap,
}: MapCanvasProps) {
  const [eventTimeVersion, setEventTimeVersion] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const svgHostRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const routeLayerRef = useRef<SVGSVGElement>(null);
  const labelLayerRef = useRef<SVGSVGElement>(null);
  const markerLayerRef = useRef<SVGSVGElement>(null);
  const floorIdRef = useRef(floorId);
  const onFloorChangeRef = useRef(onFloorChange);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewBox, setViewBox] = useState<MapViewBox>(DEFAULT_VIEW_BOX);
  const [mapLabels, setMapLabels] = useState<MapLabel[]>([]);
  const [loadedSheetId, setLoadedSheetId] = useState<string | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const lastHandledFocusRequestRef = useRef<string | null>(null);
  const overlayRedrawKey = getMapOverlayRedrawKey(viewBox, containerSize);

  floorIdRef.current = floorId;
  onFloorChangeRef.current = onFloorChange;

  const floor = floors.find((candidate) => candidate.id === floorId);
  const sheet = floor
    ? mapSheets.find((candidate) => candidate.id === floor.sheetId)
    : undefined;
  const sheetId = sheet?.id;
  const focusSearchParams = new URLSearchParams(location.search);
  const focusRequestKey = [
    focusSearchParams.get("focus") ?? "",
    focusSearchParams.get("to") ?? "",
    focusSearchParams.get("at") ?? "",
    mapFocusPlace?.id ?? "",
    focusRequestNonce,
  ].join(":");
  const routeFloorIds = routePresentation.floorIds;
  const hasVisibleRoute = routeFloorIds.has(floorId);

  useEffect(() => {
    const now = new Date();
    const changeTimestamp = getNextEventSelectionChangeTimestamp(events, now);
    if (changeTimestamp === null) {
      return;
    }

    // setTimeoutの上限を超える場合も、上限到達時に再評価して次の境界へつなぐ。
    const delay = Math.min(
      Math.max(changeTimestamp - now.getTime(), 1),
      2_147_483_647,
    );
    const timeout = window.setTimeout(
      () => setEventTimeVersion((version) => version + 1),
      delay,
    );
    return () => window.clearTimeout(timeout);
  }, [events, eventTimeVersion]);

  // Store original viewBox for zoom clamping calculation
  const originalViewBoxRef = useRef<MapViewBox>(DEFAULT_VIEW_BOX);

  // Track previous floor and its original viewBox for proportional mapping
  const previousFloorIdRef = useRef<string>(floorId);
  const previousOriginalViewBoxRef = useRef<MapViewBox>(DEFAULT_VIEW_BOX);
  // Pointer tracking for pan and pinch
  const gestureRef = useRef<{
    isPanning: boolean;
    isPinching: boolean;
    startViewBox: MapViewBox;
    panStartSvgPoint?: { x: number; y: number };
    panInverseScreenMatrix?: DOMMatrix;
    pinchStartDistance?: number;
    pinchCenter?: { x: number; y: number };
    pointerId?: number;
    pointerStartClient?: { x: number; y: number };
    pointerMoved: boolean;
  }>({
    isPanning: false,
    isPinching: false,
    pointerMoved: false,
    startViewBox: DEFAULT_VIEW_BOX,
  });

  // xMidYMid meetの実表示縮尺を幅・高さの両方から再計算できるよう寸法を監視する。
  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const updateContainerSize = (width: number, height: number) => {
      setContainerSize((currentSize) =>
        currentSize.width === width && currentSize.height === height
          ? currentSize
          : { width, height },
      );
    };
    const initialRect = container.getBoundingClientRect();
    updateContainerSize(initialRect.width, initialRect.height);

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        updateContainerSize(entry.contentRect.width, entry.contentRect.height);
      }
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Resolve floorId to a sheet and load its SVG. The text cache avoids repeat fetches.
  useEffect(() => {
    let cancelled = false;
    const listenerCleanups: Array<() => void> = [];
    const svgHost = svgHostRef.current;

    setError(null);
    if (!sheet) {
      svgRef.current = null;
      setMapLabels([]);
      if (svgHost) {
        svgHost.replaceChildren();
      }
      setError(`Floor "${floorIdRef.current}" not found`);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadedSheetId(null);
    svgRef.current = null;
    setMapLabels([]);
    svgHost?.replaceChildren();

    const loadSvg = async () => {
      try {
        const text = await fetchSvg(sheet.svgUrl);
        if (cancelled) {
          return;
        }

        const document = new DOMParser().parseFromString(text, "image/svg+xml");
        if (
          document.querySelector("parsererror") ||
          document.documentElement.localName !== "svg"
        ) {
          throw new Error("Invalid SVG");
        }

        const svgElement = document.documentElement as unknown as SVGSVGElement;
        const initialViewBox = parseMapViewBox({
          viewBox: svgElement.getAttribute("viewBox"),
          width: svgElement.getAttribute("width"),
          height: svgElement.getAttribute("height"),
        });
        svgElement.style.width = "100%";
        svgElement.style.height = "100%";
        if (sheet.id === "campus") {
          for (const [elementId, destinationFloorId] of Object.entries(buildingFloorIds)) {
            const element = svgElement.getElementById(elementId);
            if (!(element instanceof SVGElement)) {
              continue;
            }

            const openBuilding = () => onFloorChangeRef.current(destinationFloorId);
            const openBuildingWithKeyboard = (event: KeyboardEvent) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openBuilding();
              }
            };

            element.classList.add("map-canvas__interactive-building");
            element.style.cursor = "pointer";
            element.setAttribute("role", "button");
            element.setAttribute("tabindex", "0");
            element.setAttribute(
              "aria-label",
              buildingLabels[elementId as keyof typeof buildingFloorIds],
            );
            element.addEventListener("click", openBuilding);
            element.addEventListener("keydown", openBuildingWithKeyboard);
            listenerCleanups.push(() => {
              element.removeEventListener("click", openBuilding);
              element.removeEventListener("keydown", openBuildingWithKeyboard);
            });
          }
        }

        if (!svgHost || cancelled) {
          return;
        }

        svgHost.replaceChildren(svgElement);
        svgRef.current = svgElement;
        setMapLabels(extractMapLabels(svgElement));
        setLoadedSheetId(sheet.id);

        // Determine if we should preserve viewBox across floor switch
        const previousFloorId = previousFloorIdRef.current;
        let newViewBox = initialViewBox;

        if (
          previousFloorId !== floorIdRef.current &&
          previousFloorId !== DEFAULT_FLOOR_ID &&
          floorIdRef.current !== DEFAULT_FLOOR_ID &&
          isSameBuilding(previousFloorId, floorIdRef.current)
        ) {
          // Same building floor switch: apply proportional mapping
          newViewBox = getProportionalMapViewBox(
            viewBox,
            previousOriginalViewBoxRef.current,
            initialViewBox,
          );
        }

        originalViewBoxRef.current = { ...initialViewBox };
        previousOriginalViewBoxRef.current = { ...initialViewBox };
        previousFloorIdRef.current = floorIdRef.current;
        gestureRef.current.startViewBox = { ...newViewBox };
        setViewBox(newViewBox);
        setLoading(false);
      } catch (loadError) {
        if (cancelled) {
          return;
        }
        setError(loadError instanceof Error ? loadError.message : "Failed to load SVG");
        setLoading(false);
      }
    };

    void loadSvg();

    return () => {
      cancelled = true;
      for (const cleanup of listenerCleanups) {
        cleanup();
      }
    };
  }, [sheetId]);

  // Update SVG viewBox attribute
  useEffect(() => {
    const serializedViewBox = serializeMapViewBox(viewBox);
    if (svgRef.current) {
      svgRef.current.setAttribute("viewBox", serializedViewBox);
    }
    markerLayerRef.current?.setAttribute("viewBox", serializedViewBox);
    routeLayerRef.current?.setAttribute("viewBox", serializedViewBox);
    labelLayerRef.current?.setAttribute("viewBox", serializedViewBox);
  }, [viewBox]);

  // 生成済みグラフのうち、表示中フロアに属する経路区間だけを描画する。
  useEffect(() => {
    const routeLayer = routeLayerRef.current;
    routeLayer?.replaceChildren();
    if (!routeLayer || loading) {
      return;
    }

    const floorPresentation = routePresentation.floorsById.get(floorId);
    if (!floorPresentation) {
      return;
    }
    for (const edge of floorPresentation.walkEdges) {
      const path = document.createElementNS(SVG_NAMESPACE, "path");
      path.setAttribute("class", "map-route");
      path.setAttribute("data-route-edge-id", edge.id);
      path.setAttribute("d", edge.pathD);
      routeLayer.append(path);
    }

    const userUnitsPerPixel = getMeetUserUnitsPerPixel(viewBox, containerSize);
    if (userUnitsPerPixel === null) {
      return;
    }
    for (const markerPresentation of floorPresentation.transferMarkers) {
      if (markerPresentation.kind === "entrance") {
        const marker = document.createElementNS(SVG_NAMESPACE, "circle");
        marker.setAttribute("class", "map-route-transfer");
        marker.setAttribute("data-route-node-id", markerPresentation.id);
        marker.setAttribute("cx", String(markerPresentation.x));
        marker.setAttribute("cy", String(markerPresentation.y));
        marker.setAttribute(
          "r",
          String(ROUTE_TRANSFER_MARKER_RADIUS * userUnitsPerPixel),
        );
        routeLayer.append(marker);
        continue;
      }

      const group = document.createElementNS(SVG_NAMESPACE, "g");
      const badge = document.createElementNS(SVG_NAMESPACE, "circle");
      const icon = document.createElementNS(SVG_NAMESPACE, "image");
      const iconSize = ROUTE_STAIR_ICON_SIZE * userUnitsPerPixel;

      group.setAttribute("class", "map-route-stair");
      group.setAttribute("data-route-node-id", markerPresentation.id);
      group.setAttribute("data-route-stair-direction", markerPresentation.direction);
      badge.setAttribute("class", "map-route-stair__badge");
      badge.setAttribute("cx", String(markerPresentation.x));
      badge.setAttribute("cy", String(markerPresentation.y));
      badge.setAttribute(
        "r",
        String(ROUTE_STAIR_BADGE_RADIUS * userUnitsPerPixel),
      );
      icon.setAttribute("class", "map-route-stair__icon");
      icon.setAttribute(
        "href",
        markerPresentation.direction === "up"
          ? stairsArrowUpUrl
          : stairsArrowDownUrl,
      );
      icon.setAttribute("x", String(markerPresentation.x - iconSize / 2));
      icon.setAttribute("y", String(markerPresentation.y - iconSize / 2));
      icon.setAttribute("width", String(iconSize));
      icon.setAttribute("height", String(iconSize));
      icon.setAttribute("preserveAspectRatio", "xMidYMid meet");
      group.append(badge, icon);
      routeLayer.append(group);
    }
  }, [floorId, loading, overlayRedrawKey, routePresentation]);

  // 導出済みの初期表示地点へ一度だけフォーカスする。
  useEffect(() => {
    const svgElement = svgRef.current;
    if (
      loading ||
      loadedSheetId !== sheetId ||
      !mapFocusPlace ||
      mapFocusPlace.floorId !== floorId ||
      !svgElement
    ) {
      return;
    }

    if (lastHandledFocusRequestRef.current === focusRequestKey) {
      return;
    }

    const coordinates = getPlaceCoordinates(mapFocusPlace, svgElement);
    if (!coordinates) {
      // 座標が解決できない間は要求を消費せず、deps変化(フロア切替やシート
      // ロード完了)のたびに再試行できるようにする。
      return;
    }
    lastHandledFocusRequestRef.current = focusRequestKey;

    setViewBox(
      focusMapViewBox(
        originalViewBoxRef.current,
        coordinates,
        FOCUS_VIEW_BOX_RATIO,
        FOCUS_VERTICAL_ANCHOR,
      ),
    );
  }, [
    floorId,
    focusRequestKey,
    loadedSheetId,
    loading,
    mapFocusPlace,
    sheetId,
  ]);

  // 元SVGから抽出したラベルを、routeとmarkerの間の専用レイヤーへ描画する。
  useEffect(() => {
    const labelLayer = labelLayerRef.current;
    const svgElement = svgRef.current;
    labelLayer?.replaceChildren();
    if (!labelLayer || !svgElement || loading) {
      return;
    }

    const userUnitsPerPixel = getMeetUserUnitsPerPixel(viewBox, containerSize);
    if (userUnitsPerPixel === null) {
      return;
    }

    const { labelPlacements } = buildMapOverlayLayout({
      svgElement,
      userUnitsPerPixel,
      mapLabels,
      floorId,
      events,
      currentPlace,
      destinationPlace,
      focusPlace,
    });
    renderMapLabels({
      layer: labelLayer,
      placements: labelPlacements,
      userUnitsPerPixel,
    });
  }, [
    currentPlace,
    destinationPlace,
    events,
    eventTimeVersion,
    floorId,
    focusPlace,
    loading,
    mapLabels,
    overlayRedrawKey,
  ]);

  // 元地図とは独立した overlay SVG の DOM を、表示状態ごとに同期する。
  useEffect(() => {
    const markerLayer = markerLayerRef.current;
    const svgElement = svgRef.current;
    const listenerCleanups: Array<() => void> = [];
    markerLayer?.replaceChildren();
    if (!markerLayer || !svgElement || loading) {
      return;
    }

    const markerScale = getMeetUserUnitsPerPixel(viewBox, containerSize);
    if (markerScale === null) {
      return;
    }

    const { markers: markerPlacements } = buildMapOverlayLayout({
      svgElement,
      userUnitsPerPixel: markerScale,
      mapLabels,
      floorId,
      events,
      currentPlace,
      destinationPlace,
      focusPlace,
    });

    const appendEventBadge = (
      marker: EventMarkerPlacement,
      onActivate: () => void,
    ) => {
      const group = document.createElementNS(SVG_NAMESPACE, "g");
      const hitArea = document.createElementNS(SVG_NAMESPACE, "rect");
      const outline = document.createElementNS(SVG_NAMESPACE, "circle");
      const surface = document.createElementNS(SVG_NAMESPACE, "circle");
      const glyph = document.createElementNS(SVG_NAMESPACE, "path");
      const openEventWithKeyboard = (keyboardEvent: KeyboardEvent) => {
        if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") {
          keyboardEvent.preventDefault();
          onActivate();
        }
      };
      const stopMapGesture = (pointerEvent: PointerEvent) => {
        pointerEvent.stopPropagation();
      };

      group.setAttribute(
        "transform",
        getAnchoredOverlayTransform(
          marker.coordinates,
          markerScale,
          EVENT_MARKER_LOCAL_ANCHOR,
        ),
      );
      group.setAttribute(
        "class",
        `map-marker map-marker--event map-marker--event-${marker.colorKey}`,
      );
      group.setAttribute("data-event-color", marker.colorKey);
      group.setAttribute("data-anchor-x", String(marker.coordinates.x));
      group.setAttribute("data-anchor-y", String(marker.coordinates.y));
      if (marker.placeId) {
        group.setAttribute("data-place-id", marker.placeId);
      }
      if (marker.eventKey) {
        group.setAttribute("data-event-key", marker.eventKey);
      }
      if (marker.eventId) {
        group.setAttribute("data-event-id", marker.eventId);
      }
      if (marker.buildingId) {
        group.setAttribute("data-building-id", marker.buildingId);
      }
      if (marker.eventCount !== undefined) {
        group.setAttribute("data-event-count", String(marker.eventCount));
      }
      group.setAttribute("role", "button");
      group.setAttribute("tabindex", "0");
      group.setAttribute("aria-label", marker.markerLabel);
      hitArea.setAttribute("class", "map-marker__hit-area");
      hitArea.setAttribute("x", "-10");
      hitArea.setAttribute("y", "-10");
      hitArea.setAttribute("width", marker.eventCount === undefined ? "44" : "56");
      hitArea.setAttribute("height", "44");
      hitArea.setAttribute("rx", "22");
      outline.setAttribute("class", "map-marker__event-outline");
      outline.setAttribute("cx", String(EVENT_MARKER_SIZE / 2));
      outline.setAttribute("cy", String(EVENT_MARKER_SIZE / 2));
      outline.setAttribute("r", String(EVENT_MARKER_RADIUS));
      surface.setAttribute("class", "map-marker__event-surface");
      surface.setAttribute("cx", String(EVENT_MARKER_SIZE / 2));
      surface.setAttribute("cy", String(EVENT_MARKER_SIZE / 2));
      surface.setAttribute("r", String(EVENT_MARKER_RADIUS));
      glyph.setAttribute("class", "map-marker__event-glyph");
      glyph.setAttribute("d", EVENT_MARKER_PERSON_PATH);
      group.append(hitArea, outline, surface, glyph);

      if (marker.eventCount !== undefined) {
        const countText = String(marker.eventCount);
        const countWidth = getEventCountWidth(marker.eventCount);
        const countBackground = document.createElementNS(SVG_NAMESPACE, "rect");
        const countLabel = document.createElementNS(SVG_NAMESPACE, "text");
        countBackground.setAttribute("class", "map-marker__event-count-background");
        countBackground.setAttribute("x", "16");
        countBackground.setAttribute("y", "1");
        countBackground.setAttribute("width", String(countWidth));
        countBackground.setAttribute("height", "14");
        countBackground.setAttribute("rx", "7");
        countLabel.setAttribute("class", "map-marker__event-count");
        countLabel.setAttribute("x", String(16 + countWidth / 2));
        countLabel.setAttribute("y", "8");
        countLabel.textContent = countText;
        group.append(countBackground, countLabel);
      }

      group.addEventListener("pointerdown", stopMapGesture);
      group.addEventListener("click", onActivate);
      group.addEventListener("keydown", openEventWithKeyboard);
      listenerCleanups.push(() => {
        group.removeEventListener("pointerdown", stopMapGesture);
        group.removeEventListener("click", onActivate);
        group.removeEventListener("keydown", openEventWithKeyboard);
      });
      markerLayer.append(group);
    };

    // イベントを先に描画し、現在地・目的地・注目ピンを常に前面に保つ。
    for (const marker of markerPlacements) {
      if (marker.type === "event") {
        const onActivate = () => {
          if (marker.action.kind === "floor") {
            onFloorChangeRef.current(marker.action.floorId);
            return;
          }

          const selectedEvent = marker.placeId
            ? selectUpcomingEvent(
                events.filter((event) => event.placeId === marker.placeId),
                new Date(),
              )
            : null;
          onRequestBottomSheetSnap(82);
          void navigate(
            {
              pathname: getEventDetailPath(
                selectedEvent ? selectedEvent.key : marker.action.eventKey,
                selectedEvent ? selectedEvent.id : marker.eventId,
              ),
              search: location.search,
            },
            { state: location.state },
          );
        };
        appendEventBadge(marker, onActivate);
        continue;
      }

      const group = document.createElementNS(SVG_NAMESPACE, "g");
      const path = document.createElementNS(SVG_NAMESPACE, "path");
      const detailPath = document.createElementNS(SVG_NAMESPACE, "path");
      group.setAttribute(
        "transform",
        getAnchoredOverlayTransform(
          marker.coordinates,
          markerScale,
          PIN_LOCAL_ANCHOR,
        ),
      );
      group.setAttribute("class", `map-marker map-marker--${marker.markerKind}`);
      group.setAttribute("data-place-id", marker.placeId);
      group.setAttribute("data-anchor-x", String(marker.coordinates.x));
      group.setAttribute("data-anchor-y", String(marker.coordinates.y));
      path.setAttribute("d", PIN_PATH);
      detailPath.setAttribute("class", "map-marker__detail");
      detailPath.setAttribute(
        "d",
        marker.markerKind === "current" ? PERSON_DETAIL_PATH : LOCATION_DETAIL_PATH,
      );
      group.append(path, detailPath);
      markerLayer.append(group);
    }

    return () => {
      for (const cleanup of listenerCleanups) {
        cleanup();
      }
    };
  }, [
    currentPlace,
    destinationPlace,
    events,
    eventTimeVersion,
    floorId,
    focusPlace,
    loading,
    location.search,
    location.state,
    navigate,
    onRequestBottomSheetSnap,
    overlayRedrawKey,
  ]);

  // Wheel zoom handler (add via useEffect to handle preventDefault)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (event: WheelEvent) => {
      const svgElement = svgRef.current;
      if (!svgElement) return;
      event.preventDefault();

      const zoomFactor = event.deltaY > 0 ? 1.1 : 0.9;
      const zoomCenter = screenPointToSvg(svgElement, event.clientX, event.clientY);
      if (!zoomCenter) {
        return;
      }

      setViewBox(
        zoomMapViewBoxAt(
          viewBox,
          originalViewBoxRef.current,
          zoomCenter,
          zoomFactor,
        ),
      );
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, [viewBox]);

  // Pan with pointer events
  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const svgElement = svgRef.current;
    const screenMatrix = svgElement?.getScreenCTM();
    if (!containerRef.current || !screenMatrix || gestureRef.current.isPinching) return;

    const activePointerId = gestureRef.current.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    if (activePointerId !== undefined && activePointerId !== event.pointerId) {
      return;
    }

    const inverseScreenMatrix = screenMatrix.inverse();
    const panStartSvgPoint = screenPointToSvgWithMatrix(
      inverseScreenMatrix,
      event.clientX,
      event.clientY,
    );
    if (!panStartSvgPoint) return;

    gestureRef.current.isPanning = true;
    if (gestureRef.current.pointerId === undefined) {
      gestureRef.current.pointerId = event.pointerId;
    }
    gestureRef.current.startViewBox = { ...viewBox };
    gestureRef.current.panStartSvgPoint = panStartSvgPoint;
    gestureRef.current.panInverseScreenMatrix = inverseScreenMatrix;
    gestureRef.current.pointerStartClient = { x: event.clientX, y: event.clientY };
    gestureRef.current.pointerMoved = false;
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const activePointerId = gestureRef.current.pointerId;
    if (activePointerId !== undefined && activePointerId !== event.pointerId) {
      return;
    }

    if (
      gestureRef.current.isPinching ||
      !gestureRef.current.isPanning ||
      !gestureRef.current.panStartSvgPoint ||
      !gestureRef.current.panInverseScreenMatrix
    ) {
      return;
    }

    const currentSvgPoint = screenPointToSvgWithMatrix(
      gestureRef.current.panInverseScreenMatrix,
      event.clientX,
      event.clientY,
    );
    if (!currentSvgPoint) return;

    const pointerStartClient = gestureRef.current.pointerStartClient;
    if (
      pointerStartClient &&
      exceedsMapTapMovement(pointerStartClient, {
        x: event.clientX,
        y: event.clientY,
      })
    ) {
      gestureRef.current.pointerMoved = true;
    }

    setViewBox(
      panMapViewBox(
        gestureRef.current.startViewBox,
        gestureRef.current.panStartSvgPoint,
        currentSvgPoint,
        originalViewBoxRef.current,
      ),
    );
  };

  const finishPointer = (allowTap: boolean, pointerId?: number) => {
    const activePointerId = gestureRef.current.pointerId;
    if (
      activePointerId !== undefined &&
      pointerId !== undefined &&
      activePointerId !== pointerId
    ) {
      return;
    }

    const shouldCollapse =
      allowTap &&
      gestureRef.current.isPanning &&
      !gestureRef.current.isPinching &&
      !gestureRef.current.pointerMoved;
    const container = containerRef.current;
    if (activePointerId !== undefined && container?.hasPointerCapture(activePointerId)) {
      container.releasePointerCapture(activePointerId);
    }
    gestureRef.current.isPanning = false;
    gestureRef.current.panStartSvgPoint = undefined;
    gestureRef.current.panInverseScreenMatrix = undefined;
    gestureRef.current.pointerId = undefined;
    gestureRef.current.pointerStartClient = undefined;
    gestureRef.current.pointerMoved = false;
    if (shouldCollapse) {
      onRequestBottomSheetSnap(22);
    }
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) =>
    finishPointer(true, event.pointerId);

  const handlePointerCancel = (event: React.PointerEvent<HTMLDivElement>) =>
    finishPointer(false, event.pointerId);

  const startPinch = (touches: React.TouchList) => {
    const svgElement = svgRef.current;
    if (touches.length !== 2 || !svgElement) {
      return false;
    }

    const touch1 = touches[0];
    const touch2 = touches[1];
    const pinchCenter = screenPointToSvg(
      svgElement,
      (touch1.clientX + touch2.clientX) / 2,
      (touch1.clientY + touch2.clientY) / 2,
    );
    if (!pinchCenter) {
      return false;
    }

    gestureRef.current.isPanning = false;
    gestureRef.current.isPinching = true;
    gestureRef.current.pointerMoved = true;
    gestureRef.current.pinchStartDistance = Math.hypot(
      touch2.clientX - touch1.clientX,
      touch2.clientY - touch1.clientY,
    );
    gestureRef.current.pinchCenter = pinchCenter;
    gestureRef.current.startViewBox = { ...viewBox };
    return true;
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length === 2) {
      startPinch(event.touches);
    }
  };

  // Two-finger pinch zoom. Scale always compares against the gesture start.
  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 2) return;

    if (!gestureRef.current.isPinching && !startPinch(event.touches)) {
      return;
    }

    const touch1 = event.touches[0];
    const touch2 = event.touches[1];
    const currentDistance = Math.hypot(
      touch2.clientX - touch1.clientX,
      touch2.clientY - touch1.clientY,
    );

    const { pinchStartDistance, pinchCenter, startViewBox } = gestureRef.current;
    if (!pinchStartDistance || !pinchCenter || currentDistance === 0) {
      return;
    }

    const scale = pinchStartDistance / currentDistance;
    setViewBox(
      zoomMapViewBoxAt(
        startViewBox,
        originalViewBoxRef.current,
        pinchCenter,
        scale,
      ),
    );
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length >= 2) {
      return;
    }

    gestureRef.current.isPinching = false;
    gestureRef.current.pinchStartDistance = undefined;
    gestureRef.current.pinchCenter = undefined;
  };

  return (
    <div
      ref={containerRef}
      className="map-canvas"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <div ref={svgHostRef} className="map-canvas__svg-host" />
      <svg
        ref={routeLayerRef}
        className="map-canvas__route-layer"
        role={hasVisibleRoute ? "img" : undefined}
        aria-label={hasVisibleRoute ? "現在地から目的地までのルート" : undefined}
        aria-hidden={hasVisibleRoute ? undefined : true}
        preserveAspectRatio="xMidYMid meet"
      />
      <svg
        ref={labelLayerRef}
        className="map-canvas__label-layer"
        aria-hidden="true"
        preserveAspectRatio="xMidYMid meet"
      />
      <svg
        ref={markerLayerRef}
        className="map-canvas__marker-layer"
        role="group"
        aria-label="地図マーカー"
        preserveAspectRatio="xMidYMid meet"
      />

      {loading && <p className="map-canvas__status">地図を読み込み中...</p>}
      {error && (
        <p className="map-canvas__status" role="alert">
          地図の読み込みに失敗しました: {error}
        </p>
      )}
    </div>
  );
}
