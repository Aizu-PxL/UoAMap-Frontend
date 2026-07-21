import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { floors, getPlace, mapSheets } from "../../data/places";
import type { Event as CampusEvent, Place, RouteEdge } from "../../data/types";
import { extractMapLabels, renderMapLabels } from "./mapLabels";
import type { MapLabel } from "./mapLabels";
import { getMeetUserUnitsPerPixel } from "./mapViewportScale";
import { getPlaceCoordinates, getSvgElementCoordinates } from "./placeLocator";
import { routeGraph } from "../routing/routeGraph";

interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface MapCanvasProps {
  floorId?: string;
  onFloorChange: (floorId: string) => void;
  currentPlace: Place | null;
  destinationPlace: Place | null;
  focusPlace: Place | null;
  focusRequestNonce: number;
  events: CampusEvent[];
  routeEdges: RouteEdge[];
}

const DEFAULT_FLOOR_ID = "campus";
const DEFAULT_VIEW_BOX: ViewBox = {
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
// ラベルはアンカー位置に固定するため、マーカーをラベル(画面約12px)の上へ持ち上げて重なりを避ける。
// translate は scale(markerScale) 後=1単位が画面1px相当なので、この値がそのまま画面px上の持ち上げ量になる。
const MARKER_LABEL_CLEARANCE_PX = 18;
const EVENT_MARKER_PERSON_PATH =
  "M12 10.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6.75 18h10.5v-1.5c0-2.5-2.33-4.5-5.25-4.5s-5.25 2-5.25 4.5V18Z";
const ROUTE_TRANSFER_MARKER_RADIUS = 7;
const routeNodeById = new Map(routeGraph.nodes.map((node) => [node.id, node]));

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

type CampusBuildingId = keyof typeof buildingFloorIds;

// Place → Floor → MapSheet を、キャンパス図上の建物アンカーへ束ねる。
const campusBuildingIdBySheetId: Record<string, CampusBuildingId> = {
  rq1f: "building_ResearchQuad",
  rq2f: "building_ResearchQuad",
  rq3f: "building_ResearchQuad",
  sh1f: "building_StudentHall",
  sh2f: "building_StudentHall",
  lh1f: "building_LecHall",
  lh2f: "building_LecHall",
  ubic: "building_UBIC",
  lictia: "building_LICTiA",
};

function resolveCampusBuildingId(place: Place): CampusBuildingId | null {
  const placeFloor = floors.find((candidate) => candidate.id === place.floorId);
  if (!placeFloor) {
    return null;
  }

  const sheetBuildingId = campusBuildingIdBySheetId[placeFloor.sheetId];
  if (sheetBuildingId) {
    return sheetBuildingId;
  }

  if (
    placeFloor.sheetId === DEFAULT_FLOOR_ID &&
    place.mapping === "svg" &&
    place.svgElementId in buildingFloorIds
  ) {
    return place.svgElementId as CampusBuildingId;
  }

  return null;
}

function getCampusEventCounts(events: CampusEvent[]) {
  const eventCountByBuildingId = new Map<CampusBuildingId, number>();

  for (const event of events) {
    const place = getPlace(event.placeId);
    const buildingId = place ? resolveCampusBuildingId(place) : null;
    if (!buildingId) {
      continue;
    }

    eventCountByBuildingId.set(
      buildingId,
      (eventCountByBuildingId.get(buildingId) ?? 0) + 1,
    );
  }

  return eventCountByBuildingId;
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

function extractNumericValue(value: string | null): number | null {
  if (!value) return null;
  const num = parseFloat(value);
  return Number.isFinite(num) ? num : null;
}

function parseViewBox(svgElement: SVGSVGElement): ViewBox {
  // Try viewBox attribute first
  const viewBoxAttr = svgElement.getAttribute("viewBox");
  if (viewBoxAttr !== null) {
    const values = viewBoxAttr
      .trim()
      .split(/[\s,]+/)
      .map(Number);

    if (
      values.length === 4 &&
      values.every((value) => Number.isFinite(value)) &&
      values[2] > 0 &&
      values[3] > 0
    ) {
      return {
        x: values[0],
        y: values[1],
        width: values[2],
        height: values[3],
      };
    }

    throw new Error("Invalid SVG viewBox");
  }

  // Fallback: try width/height attributes (e.g., for RQ2F which has no viewBox)
  const width = extractNumericValue(svgElement.getAttribute("width"));
  const height = extractNumericValue(svgElement.getAttribute("height"));

  if (width && width > 0 && height && height > 0) {
    return {
      x: 0,
      y: 0,
      width,
      height,
    };
  }

  throw new Error("Invalid SVG viewBox");
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

function clampViewBoxSize(width: number, originalViewBox: ViewBox) {
  const minWidth = originalViewBox.width / 8;
  const maxWidth = originalViewBox.width * 2;
  const clampedWidth = Math.min(Math.max(width, minWidth), maxWidth);

  return {
    width: clampedWidth,
    height: originalViewBox.height * (clampedWidth / originalViewBox.width),
  };
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

function getProportionalViewBox(
  currentViewBox: ViewBox,
  previousOriginalViewBox: ViewBox,
  newOriginalViewBox: ViewBox,
): ViewBox {
  // Calculate relative position and size as percentages of previous sheet
  const centerXPercent =
    (currentViewBox.x + currentViewBox.width / 2 - previousOriginalViewBox.x) /
    previousOriginalViewBox.width;
  const centerYPercent =
    (currentViewBox.y + currentViewBox.height / 2 - previousOriginalViewBox.y) /
    previousOriginalViewBox.height;
  const widthPercent = currentViewBox.width / previousOriginalViewBox.width;
  const heightPercent = currentViewBox.height / previousOriginalViewBox.height;

  // Apply percentages to new sheet
  const newWidth = widthPercent * newOriginalViewBox.width;
  const newHeight = heightPercent * newOriginalViewBox.height;
  const newCenterX = newOriginalViewBox.x + centerXPercent * newOriginalViewBox.width;
  const newCenterY = newOriginalViewBox.y + centerYPercent * newOriginalViewBox.height;

  return {
    x: newCenterX - newWidth / 2,
    y: newCenterY - newHeight / 2,
    width: newWidth,
    height: newHeight,
  };
}

export function MapCanvas({
  floorId = DEFAULT_FLOOR_ID,
  onFloorChange,
  currentPlace,
  destinationPlace,
  focusPlace,
  focusRequestNonce,
  events,
  routeEdges,
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
  const [viewBox, setViewBox] = useState<ViewBox>(DEFAULT_VIEW_BOX);
  const [mapLabels, setMapLabels] = useState<MapLabel[]>([]);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const lastHandledFocusRequestRef = useRef<string | null>(null);

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
  const routeFloorIds = new Set<string>();
  for (const edge of routeEdges) {
    if (edge.kind === "walk") {
      routeFloorIds.add(edge.floorId);
      continue;
    }

    const nodeA = routeNodeById.get(edge.nodeA);
    const nodeB = routeNodeById.get(edge.nodeB);
    if (nodeA) {
      routeFloorIds.add(nodeA.floorId);
    }
    if (nodeB) {
      routeFloorIds.add(nodeB.floorId);
    }
  }
  const hasVisibleRoute = routeFloorIds.has(floorId);
  const isCampusOnRoute = routeFloorIds.has(DEFAULT_FLOOR_ID);

  // Store original viewBox for zoom clamping calculation
  const originalViewBoxRef = useRef<ViewBox>(DEFAULT_VIEW_BOX);

  // Track previous floor and its original viewBox for proportional mapping
  const previousFloorIdRef = useRef<string>(floorId);
  const previousOriginalViewBoxRef = useRef<ViewBox>(DEFAULT_VIEW_BOX);
  // Pointer tracking for pan and pinch
  const gestureRef = useRef<{
    isPanning: boolean;
    isPinching: boolean;
    startViewBox: ViewBox;
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
        const initialViewBox = parseViewBox(svgElement);
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
          newViewBox = getProportionalViewBox(
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
    if (svgRef.current) {
      svgRef.current.setAttribute(
        "viewBox",
        `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`,
      );
    }
    markerLayerRef.current?.setAttribute(
      "viewBox",
      `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`,
    );
    routeLayerRef.current?.setAttribute(
      "viewBox",
      `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`,
    );
    labelLayerRef.current?.setAttribute(
      "viewBox",
      `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`,
    );
  }, [viewBox]);

  // 生成済みグラフのうち、表示中フロアに属する経路区間だけを描画する。
  useEffect(() => {
    const routeLayer = routeLayerRef.current;
    routeLayer?.replaceChildren();
    if (!routeLayer || loading) {
      return;
    }

    const transferNodeIds = new Set<string>();
    for (const edge of routeEdges) {
      if (edge.kind === "transfer") {
        for (const nodeId of [edge.nodeA, edge.nodeB]) {
          if (routeNodeById.get(nodeId)?.floorId === floorId) {
            transferNodeIds.add(nodeId);
          }
        }
        continue;
      }
      if (edge.floorId !== floorId) {
        continue;
      }
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
    for (const nodeId of transferNodeIds) {
      const node = routeNodeById.get(nodeId);
      if (!node) {
        continue;
      }
      const marker = document.createElementNS(SVG_NAMESPACE, "circle");
      marker.setAttribute("class", "map-route-transfer");
      marker.setAttribute("data-route-node-id", node.id);
      marker.setAttribute("cx", String(node.x));
      marker.setAttribute("cy", String(node.y));
      marker.setAttribute("r", String(ROUTE_TRANSFER_MARKER_RADIUS * userUnitsPerPixel));
      routeLayer.append(marker);
    }
  }, [containerSize, floorId, loading, routeEdges, viewBox]);

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

    const originalViewBox = originalViewBoxRef.current;
    const focusedWidth = originalViewBox.width * FOCUS_VIEW_BOX_RATIO;
    const focusedHeight = originalViewBox.height * FOCUS_VIEW_BOX_RATIO;
    setViewBox({
      x: coordinates.x - focusedWidth / 2,
      y: coordinates.y - focusedHeight * FOCUS_VERTICAL_ANCHOR,
      width: focusedWidth,
      height: focusedHeight,
    });
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

    // ラベルはアンカー位置に固定し、マーカーとの重なりはマーカー側を持ち上げて回避する。
    // そのためラベル描画はマーカー集合に依存しない。
    renderMapLabels({
      layer: labelLayer,
      labels: mapLabels,
      userUnitsPerPixel,
      isCampusOverview: floorId === DEFAULT_FLOOR_ID,
    });
  }, [
    floorId,
    loading,
    mapLabels,
    containerSize.height,
    containerSize.width,
    viewBox.height,
    viewBox.width,
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
    const eventsByPlaceId = new Map<
      string,
      { firstEvent: CampusEvent; eventCount: number }
    >();
    const pinPlaceIds = new Set(
      [currentPlace, destinationPlace, focusPlace]
        .filter((place): place is Place => place !== null)
        .map((place) => place.id),
    );

    for (const event of events) {
      const eventGroup = eventsByPlaceId.get(event.placeId);
      eventsByPlaceId.set(event.placeId, {
        firstEvent: eventGroup?.firstEvent ?? event,
        eventCount: (eventGroup?.eventCount ?? 0) + 1,
      });
    }

    const appendEventBadge = ({
      coordinates,
      markerLabel,
      onActivate,
      placeId,
      eventId,
      buildingId,
      eventCount,
    }: {
      coordinates: { x: number; y: number };
      markerLabel: string;
      onActivate: () => void;
      placeId?: string;
      eventId?: string;
      buildingId?: CampusBuildingId;
      eventCount?: number;
    }) => {
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
        `translate(${coordinates.x} ${coordinates.y}) scale(${markerScale}) translate(-${EVENT_MARKER_SIZE / 2} -${EVENT_MARKER_SIZE + MARKER_LABEL_CLEARANCE_PX})`,
      );
      group.setAttribute("class", "map-marker map-marker--event");
      if (placeId) {
        group.setAttribute("data-place-id", placeId);
      }
      if (eventId) {
        group.setAttribute("data-event-id", eventId);
      }
      if (buildingId) {
        group.setAttribute("data-building-id", buildingId);
      }
      if (eventCount !== undefined) {
        group.setAttribute("data-event-count", String(eventCount));
      }
      group.setAttribute("role", "button");
      group.setAttribute("tabindex", "0");
      group.setAttribute("aria-label", markerLabel);
      hitArea.setAttribute("class", "map-marker__hit-area");
      hitArea.setAttribute("x", "-10");
      hitArea.setAttribute("y", "-10");
      hitArea.setAttribute("width", eventCount === undefined ? "44" : "56");
      hitArea.setAttribute("height", "44");
      hitArea.setAttribute("rx", "22");
      surface.setAttribute("class", "map-marker__event-surface");
      surface.setAttribute("cx", String(EVENT_MARKER_SIZE / 2));
      surface.setAttribute("cy", String(EVENT_MARKER_SIZE / 2));
      surface.setAttribute("r", String(EVENT_MARKER_RADIUS));
      glyph.setAttribute("class", "map-marker__event-glyph");
      glyph.setAttribute("d", EVENT_MARKER_PERSON_PATH);
      group.append(hitArea, surface, glyph);

      if (eventCount !== undefined) {
        const countText = String(eventCount);
        const countWidth = Math.max(14, 8 + countText.length * 6);
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
    if (floorId === DEFAULT_FLOOR_ID) {
      const occupiedBuildingIds = new Set(
        [currentPlace, destinationPlace, focusPlace]
          .filter(
            (place): place is Place =>
              place !== null && place.floorId === DEFAULT_FLOOR_ID,
          )
          .map(resolveCampusBuildingId)
          .filter((buildingId): buildingId is CampusBuildingId => buildingId !== null),
      );

      for (const [buildingId, eventCount] of getCampusEventCounts(events)) {
        if (occupiedBuildingIds.has(buildingId)) {
          continue;
        }

        const coordinates = getSvgElementCoordinates(buildingId, svgElement);
        if (!coordinates) {
          continue;
        }

        appendEventBadge({
          coordinates,
          markerLabel: `${buildingLabels[buildingId].replace(
            "を表示",
            "",
          )}、イベント${eventCount}件。建物を表示`,
          onActivate: () => onFloorChangeRef.current(buildingFloorIds[buildingId]),
          buildingId,
          eventCount,
        });
      }

      for (const [placeId, { firstEvent, eventCount }] of eventsByPlaceId) {
        const place = getPlace(placeId);
        if (
          !place ||
          place.floorId !== DEFAULT_FLOOR_ID ||
          resolveCampusBuildingId(place) !== null ||
          pinPlaceIds.has(placeId)
        ) {
          continue;
        }

        const coordinates = getPlaceCoordinates(place, svgElement);
        if (!coordinates) {
          continue;
        }

        const openEvent = () => {
          const searchParams = new URLSearchParams(location.search);
          searchParams.set("highlight", firstEvent.id);
          void navigate({
            pathname: "/events",
            search: `?${searchParams.toString()}`,
          });
        };

        appendEventBadge({
          coordinates,
          markerLabel: `${place.name}のイベント${eventCount}件を表示: ${firstEvent.title}`,
          onActivate: openEvent,
          placeId: place.id,
          eventId: firstEvent.id,
          eventCount,
        });
      }
    } else {
      for (const [placeId, { firstEvent }] of eventsByPlaceId) {
        const place = getPlace(placeId);
        if (!place || place.floorId !== floorId || pinPlaceIds.has(placeId)) {
          continue;
        }

        const coordinates = getPlaceCoordinates(place, svgElement);
        if (!coordinates) {
          continue;
        }

        const openEvent = () => {
          const searchParams = new URLSearchParams(location.search);
          searchParams.set("highlight", firstEvent.id);
          void navigate({
            pathname: "/events",
            search: `?${searchParams.toString()}`,
          });
        };

        appendEventBadge({
          coordinates,
          markerLabel: `${place.name}のイベントを表示: ${firstEvent.title}`,
          onActivate: openEvent,
          placeId: place.id,
          eventId: firstEvent.id,
        });
      }
    }

    const markers = [
      { place: currentPlace, kind: "current", detailPath: PERSON_DETAIL_PATH },
      { place: destinationPlace, kind: "destination", detailPath: LOCATION_DETAIL_PATH },
      { place: focusPlace, kind: "focus", detailPath: LOCATION_DETAIL_PATH },
    ] as const;

    for (const marker of markers) {
      if (!marker.place || marker.place.floorId !== floorId) {
        continue;
      }

      const coordinates = getPlaceCoordinates(marker.place, svgElement);
      if (!coordinates) {
        continue;
      }

      const group = document.createElementNS(SVG_NAMESPACE, "g");
      const path = document.createElementNS(SVG_NAMESPACE, "path");
      const detailPath = document.createElementNS(SVG_NAMESPACE, "path");
      group.setAttribute(
        "transform",
        `translate(${coordinates.x} ${coordinates.y}) scale(${markerScale}) translate(-25 -${45.83 + MARKER_LABEL_CLEARANCE_PX})`,
      );
      group.setAttribute("class", `map-marker map-marker--${marker.kind}`);
      group.setAttribute("data-place-id", marker.place.id);
      path.setAttribute("d", PIN_PATH);
      detailPath.setAttribute("class", "map-marker__detail");
      detailPath.setAttribute("d", marker.detailPath);
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
    containerSize.height,
    containerSize.width,
    destinationPlace,
    events,
    floorId,
    focusPlace,
    loading,
    location.search,
    navigate,
    viewBox,
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

      const anchorX = (zoomCenter.x - viewBox.x) / viewBox.width;
      const anchorY = (zoomCenter.y - viewBox.y) / viewBox.height;
      const { width, height } = clampViewBoxSize(
        viewBox.width * zoomFactor,
        originalViewBoxRef.current,
      );

      setViewBox({
        x: zoomCenter.x - anchorX * width,
        y: zoomCenter.y - anchorY * height,
        width,
        height,
      });
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

    const deltaX = gestureRef.current.panStartSvgPoint.x - currentSvgPoint.x;
    const deltaY = gestureRef.current.panStartSvgPoint.y - currentSvgPoint.y;

    setViewBox({
      ...gestureRef.current.startViewBox,
      x: gestureRef.current.startViewBox.x + deltaX,
      y: gestureRef.current.startViewBox.y + deltaY,
    });
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
    const anchorX = (pinchCenter.x - startViewBox.x) / startViewBox.width;
    const anchorY = (pinchCenter.y - startViewBox.y) / startViewBox.height;
    const { width, height } = clampViewBoxSize(
      startViewBox.width * scale,
      originalViewBoxRef.current,
    );

    setViewBox({
      x: pinchCenter.x - anchorX * width,
      y: pinchCenter.y - anchorY * height,
      width,
      height,
    });
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
