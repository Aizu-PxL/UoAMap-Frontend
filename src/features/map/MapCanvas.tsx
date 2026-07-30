import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { setEventHighlightSearchParams } from "../../app/navigationSearch";
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
  type EventMarkerPlacement,
  type MapMarkerPlacement,
} from "./mapMarkerPresentation";
import { getMapOverlayRedrawKey } from "./mapOverlayRedraw";
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
import { getPlaceCoordinates, getSvgElementCoordinates } from "./placeLocator";

interface MapCanvasProps {
  floorId?: string;
  onFloorChange: (floorId: string) => void;
  currentPlace: Place | null;
  destinationPlace: Place | null;
  focusPlace: Place | null;
  focusRequestNonce: number;
  events: CampusEvent[];
  routePresentation: RoutePresentation;
}

const DEFAULT_FLOOR_ID = "campus";
const DEFAULT_VIEW_BOX: MapViewBox = {
  x: 0,
  y: 0,
  width: 1000,
  height: 1000,
};

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const FOCUS_VIEW_BOX_RATIO = 0.4;
const FOCUS_VERTICAL_ANCHOR = 0.2;
const PIN_PATH =
  "M25 45.83c-5.59-4.76-9.77-9.17-12.53-13.25-2.76-4.08-4.14-7.86-4.14-11.33 0-5.21 1.68-9.36 5.03-12.45C16.71 5.71 20.59 4.17 25 4.17s8.29 1.55 11.64 4.64c3.35 3.09 5.03 7.24 5.03 12.45 0 3.47-1.38 7.25-4.14 11.33-2.76 4.08-6.94 8.49-12.53 13.25Z";
const LOCATION_DETAIL_PATH = "M25 27.08a5.83 5.83 0 1 0 0-11.66 5.83 5.83 0 0 0 0 11.66Z";
const PERSON_DETAIL_PATH =
  "M25 20.42a4.17 4.17 0 1 0 0-8.34 4.17 4.17 0 0 0 0 8.34Zm-7.29 10.41h14.58v-2.08c0-3.47-3.24-6.25-7.29-6.25s-7.29 2.78-7.29 6.25v2.08Z";
const EVENT_MARKER_SIZE = 24;
const EVENT_MARKER_RADIUS = 11;
const EVENT_MARKER_LOCAL_ANCHOR = { x: 12, y: 12 };
const PIN_LOCAL_ANCHOR = { x: 25, y: 45.83 };
const MARKER_COLLISION_PADDING_PX = 2;
const EVENT_MARKER_PERSON_PATH =
  "M12 10.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6.75 18h10.5v-1.5c0-2.5-2.33-4.5-5.25-4.5s-5.25 2-5.25 4.5V18Z";
const ROUTE_TRANSFER_MARKER_RADIUS = 7;
const floorGroups = [
  ["rq-1f", "rq-2f", "rq-3f"],
  ["sh-1f", "sh-2f"],
  ["lh-1f", "lh-2f"],
] as const;

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

function getEventCountWidth(eventCount: number): number {
  return Math.max(14, 8 + String(eventCount).length * 6);
}

function getMarkerExclusionBounds(
  marker: MapMarkerPlacement,
  userUnitsPerPixel: number,
): OverlayBounds {
  if (marker.type === "pin") {
    return getAnchoredOverlayBounds(
      { left: 0, top: 0, right: 50, bottom: 45.83 },
      marker.coordinates,
      userUnitsPerPixel,
      PIN_LOCAL_ANCHOR,
      MARKER_COLLISION_PADDING_PX,
    );
  }

  const eventRight =
    marker.eventCount === undefined
      ? EVENT_MARKER_SIZE
      : Math.max(EVENT_MARKER_SIZE, 16 + getEventCountWidth(marker.eventCount));
  return getAnchoredOverlayBounds(
    { left: 0, top: 0, right: eventRight, bottom: EVENT_MARKER_SIZE },
    marker.coordinates,
    userUnitsPerPixel,
    EVENT_MARKER_LOCAL_ANCHOR,
    MARKER_COLLISION_PADDING_PX,
  );
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

function getFloorLabel(floorId: string) {
  return floorId.slice(floorId.lastIndexOf("-") + 1).toUpperCase();
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

function isSameBuilding(floorId1: string, floorId2: string): boolean {
  for (const group of floorGroups) {
    const inGroup1 = group.includes(floorId1 as never);
    const inGroup2 = group.includes(floorId2 as never);
    if (inGroup1 && inGroup2) {
      return true;
    }
  }
  return false;
}

export function MapCanvas({
  floorId = DEFAULT_FLOOR_ID,
  onFloorChange,
  currentPlace,
  destinationPlace,
  focusPlace,
  focusRequestNonce,
  events,
  routePresentation,
}: MapCanvasProps) {
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
    focusRequestNonce,
  ].join(":");
  const selectableFloorIds = floorGroups.find((group) =>
    group.some((candidate) => candidate === floorId),
  );
  const routeFloorIds = routePresentation.floorIds;
  const hasVisibleRoute = routeFloorIds.has(floorId);
  const isCampusOnRoute = routeFloorIds.has(DEFAULT_FLOOR_ID);

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
  }>({
    isPanning: false,
    isPinching: false,
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
    for (const node of floorPresentation.transferNodes) {
      const marker = document.createElementNS(SVG_NAMESPACE, "circle");
      marker.setAttribute("class", "map-route-transfer");
      marker.setAttribute("data-route-node-id", node.id);
      marker.setAttribute("cx", String(node.x));
      marker.setAttribute("cy", String(node.y));
      marker.setAttribute("r", String(ROUTE_TRANSFER_MARKER_RADIUS * userUnitsPerPixel));
      routeLayer.append(marker);
    }
  }, [floorId, loading, overlayRedrawKey, routePresentation]);

  // URL 状態の優先地点へ一度だけフォーカスする (focus > to > at)。
  useEffect(() => {
    const prioritizedPlace = focusPlace ?? destinationPlace ?? currentPlace;
    const svgElement = svgRef.current;
    if (
      loading ||
      !prioritizedPlace ||
      prioritizedPlace.floorId !== floorId ||
      !svgElement
    ) {
      return;
    }

    if (lastHandledFocusRequestRef.current === focusRequestKey) {
      return;
    }

    const coordinates = getPlaceCoordinates(prioritizedPlace, svgElement);
    lastHandledFocusRequestRef.current = focusRequestKey;
    if (!coordinates) {
      return;
    }

    setViewBox(
      focusMapViewBox(
        originalViewBoxRef.current,
        coordinates,
        FOCUS_VIEW_BOX_RATIO,
        FOCUS_VERTICAL_ANCHOR,
      ),
    );
  }, [currentPlace, destinationPlace, floorId, focusPlace, focusRequestKey, loading]);

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

    const markerPlacements = createMapMarkerPresentation({
      currentPlace,
      destinationPlace,
      events,
      floorId,
      focusPlace,
      resolveCoordinates: (target) =>
        target.kind === "place"
          ? getPlaceCoordinates(target.place, svgElement)
          : getSvgElementCoordinates(target.elementId, svgElement),
      resolveFloorSheetId: (targetFloorId) =>
        floors.find((candidate) => candidate.id === targetFloorId)?.sheetId ?? null,
      resolvePlace: (placeId) => getPlace(placeId) ?? null,
    });
    renderMapLabels({
      layer: labelLayer,
      labels: mapLabels,
      userUnitsPerPixel,
      isCampusOverview: floorId === DEFAULT_FLOOR_ID,
      exclusionBounds: markerPlacements.map((marker) =>
        getMarkerExclusionBounds(marker, userUnitsPerPixel),
      ),
    });
  }, [
    currentPlace,
    destinationPlace,
    events,
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

    const markerPlacements = createMapMarkerPresentation({
      currentPlace,
      destinationPlace,
      events,
      floorId,
      focusPlace,
      resolveCoordinates: (target) =>
        target.kind === "place"
          ? getPlaceCoordinates(target.place, svgElement)
          : getSvgElementCoordinates(target.elementId, svgElement),
      resolveFloorSheetId: (targetFloorId) =>
        floors.find((candidate) => candidate.id === targetFloorId)?.sheetId ?? null,
      resolvePlace: (placeId) => getPlace(placeId) ?? null,
    });

    const appendEventBadge = (
      marker: EventMarkerPlacement,
      onActivate: () => void,
    ) => {
      const group = document.createElementNS(SVG_NAMESPACE, "g");
      const hitArea = document.createElementNS(SVG_NAMESPACE, "rect");
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
      group.setAttribute("class", "map-marker map-marker--event");
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
      surface.setAttribute("class", "map-marker__event-surface");
      surface.setAttribute("cx", String(EVENT_MARKER_SIZE / 2));
      surface.setAttribute("cy", String(EVENT_MARKER_SIZE / 2));
      surface.setAttribute("r", String(EVENT_MARKER_RADIUS));
      glyph.setAttribute("class", "map-marker__event-glyph");
      glyph.setAttribute("d", EVENT_MARKER_PERSON_PATH);
      group.append(hitArea, surface, glyph);

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

          const searchParams = setEventHighlightSearchParams(
            new URLSearchParams(location.search),
            marker.action.eventKey,
          );
          void navigate({
            pathname: "/events",
            search: `?${searchParams.toString()}`,
          });
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
    floorId,
    focusPlace,
    loading,
    location.search,
    navigate,
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

    const inverseScreenMatrix = screenMatrix.inverse();
    const panStartSvgPoint = screenPointToSvgWithMatrix(
      inverseScreenMatrix,
      event.clientX,
      event.clientY,
    );
    if (!panStartSvgPoint) return;

    gestureRef.current.isPanning = true;
    gestureRef.current.startViewBox = { ...viewBox };
    gestureRef.current.panStartSvgPoint = panStartSvgPoint;
    gestureRef.current.panInverseScreenMatrix = inverseScreenMatrix;
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
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

    setViewBox(
      panMapViewBox(
        gestureRef.current.startViewBox,
        gestureRef.current.panStartSvgPoint,
        currentSvgPoint,
      ),
    );
  };

  const handlePointerUp = () => {
    gestureRef.current.isPanning = false;
    gestureRef.current.panStartSvgPoint = undefined;
    gestureRef.current.panInverseScreenMatrix = undefined;
  };

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

    gestureRef.current.isPanning = false;
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
      onPointerLeave={handlePointerUp}
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

      <div
        className="map-canvas__controls"
        aria-label="地図表示切替"
        onPointerDown={(event) => event.stopPropagation()}
      >
        {selectableFloorIds && (
          <div className="map-canvas__floor-switch" aria-label="フロア切替">
            {selectableFloorIds.map((selectableFloorId) => {
              const floorLabel = getFloorLabel(selectableFloorId);
              const isOnRoute = routeFloorIds.has(selectableFloorId);
              return (
                <button
                  key={selectableFloorId}
                  type="button"
                  className={`map-canvas__floor-button${
                    isOnRoute ? " map-canvas__floor-button--on-route" : ""
                  }`}
                  aria-label={isOnRoute ? `${floorLabel}、ルート上` : floorLabel}
                  aria-pressed={selectableFloorId === floorId}
                  onClick={() => onFloorChange(selectableFloorId)}
                >
                  {floorLabel}
                </button>
              );
            })}
          </div>
        )}
        {floorId !== DEFAULT_FLOOR_ID && (
          <button
            type="button"
            className={`map-canvas__campus-button${
              isCampusOnRoute ? " map-canvas__campus-button--on-route" : ""
            }`}
            aria-label={
              isCampusOnRoute
                ? "キャンパス全体へ戻る、ルート上"
                : "キャンパス全体へ戻る"
            }
            onClick={() => onFloorChange(DEFAULT_FLOOR_ID)}
          >
            キャンパス全体へ戻る
          </button>
        )}
      </div>

      {loading && <p className="map-canvas__status">地図を読み込み中...</p>}
      {error && (
        <p className="map-canvas__status" role="alert">
          地図の読み込みに失敗しました: {error}
        </p>
      )}
    </div>
  );
}
