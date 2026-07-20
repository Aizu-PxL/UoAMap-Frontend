import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { floors, getPlace, mapSheets } from "../../data/places";
import type { Event as CampusEvent, Place } from "../../data/types";
import { getPlaceCoordinates } from "./placeLocator";

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
const MARKER_REFERENCE_WIDTH = 390;
const PIN_PATH =
  "M25 45.83c-5.59-4.76-9.77-9.17-12.53-13.25-2.76-4.08-4.14-7.86-4.14-11.33 0-5.21 1.68-9.36 5.03-12.45C16.71 5.71 20.59 4.17 25 4.17s8.29 1.55 11.64 4.64c3.35 3.09 5.03 7.24 5.03 12.45 0 3.47-1.38 7.25-4.14 11.33-2.76 4.08-6.94 8.49-12.53 13.25Z";
const LOCATION_DETAIL_PATH = "M25 27.08a5.83 5.83 0 1 0 0-11.66 5.83 5.83 0 0 0 0 11.66Z";
const PERSON_DETAIL_PATH =
  "M25 20.42a4.17 4.17 0 1 0 0-8.34 4.17 4.17 0 0 0 0 8.34Zm-7.29 10.41h14.58v-2.08c0-3.47-3.24-6.25-7.29-6.25s-7.29 2.78-7.29 6.25v2.08Z";
// FigmaのMarker/Event(79:364)からエクスポートした人型バッジ形状(22×25)
const EVENT_MARKER_BACKGROUND_PATH =
  "M11 25L7.33333 21.4286H2.44444C1.77222 21.4286 1.19676 21.1954 0.718056 20.7292C0.239352 20.2629 0 19.7024 0 19.0476V2.38095C0 1.72619 0.239352 1.16567 0.718056 0.699405C1.19676 0.233135 1.77222 0 2.44444 0H19.5556C20.2278 0 20.8032 0.233135 21.2819 0.699405C21.7606 1.16567 22 1.72619 22 2.38095V19.0476C22 19.7024 21.7606 20.2629 21.2819 20.7292C20.8032 21.1954 20.2278 21.4286 19.5556 21.4286H14.6667L11 25Z";
const EVENT_MARKER_PATH =
  "M11 25L7.33333 21.4286H2.44444C1.77222 21.4286 1.19676 21.1954 0.718056 20.7292C0.239352 20.2629 0 19.7024 0 19.0476V2.38095C0 1.72619 0.239352 1.16567 0.718056 0.699405C1.19676 0.233135 1.77222 0 2.44444 0H19.5556C20.2278 0 20.8032 0.233135 21.2819 0.699405C21.7606 1.16567 22 1.72619 22 2.38095V19.0476C22 19.7024 21.7606 20.2629 21.2819 20.7292C20.8032 21.1954 20.2278 21.4286 19.5556 21.4286H14.6667L11 25ZM2.44444 17.6786C3.54444 16.627 4.82269 15.7986 6.27917 15.1935C7.73565 14.5883 9.30926 14.2857 11 14.2857C12.6907 14.2857 14.2644 14.5883 15.7208 15.1935C17.1773 15.7986 18.4556 16.627 19.5556 17.6786V2.38095H2.44444V17.6786ZM14.025 10.6845C14.8602 9.87103 15.2778 8.88889 15.2778 7.7381C15.2778 6.5873 14.8602 5.60516 14.025 4.79167C13.1898 3.97817 12.1815 3.57143 11 3.57143C9.81852 3.57143 8.81019 3.97817 7.975 4.79167C7.13981 5.60516 6.72222 6.5873 6.72222 7.7381C6.72222 8.88889 7.13981 9.87103 7.975 10.6845C8.81019 11.498 9.81852 11.9048 11 11.9048C12.1815 11.9048 13.1898 11.498 14.025 10.6845ZM4.88889 19.0476H17.1111V18.75C16.2556 18.0556 15.3083 17.5347 14.2694 17.1875C13.2306 16.8403 12.1407 16.6667 11 16.6667C9.85926 16.6667 8.76944 16.8403 7.73056 17.1875C6.69167 17.5347 5.74444 18.0556 4.88889 18.75V19.0476ZM9.70139 9.00298C9.34491 8.65575 9.16667 8.23413 9.16667 7.7381C9.16667 7.24206 9.34491 6.82044 9.70139 6.47321C10.0579 6.12599 10.4907 5.95238 11 5.95238C11.5093 5.95238 11.9421 6.12599 12.2986 6.47321C12.6551 6.82044 12.8333 7.24206 12.8333 7.7381C12.8333 8.23413 12.6551 8.65575 12.2986 9.00298C11.9421 9.3502 11.5093 9.52381 11 9.52381C10.4907 9.52381 10.0579 9.3502 9.70139 9.00298Z";
// バッジ(25px)を従来ピン(42px)と同程度の画面サイズにする倍率
const EVENT_MARKER_SCALE = 1.6;

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

const lectureHallFloorElements = {
  "lh-1f": ["fill_1F", "frame_1F", "part_1F", "room_1F", "text_1F", "mark_1F"],
  "lh-2f": ["fill_2F", "frame_2F", "part_2F", "room_2F", "text_2F", "mark_2F"],
} as const;

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

function setLectureHallFloor(svgElement: SVGSVGElement, floorId: string) {
  if (floorId !== "lh-1f" && floorId !== "lh-2f") {
    return;
  }

  for (const [lectureHallFloorId, elementIds] of Object.entries(lectureHallFloorElements)) {
    const display = lectureHallFloorId === floorId ? "inline" : "none";
    for (const elementId of elementIds) {
      const element = svgElement.getElementById(elementId);
      if (element instanceof SVGElement) {
        element.style.display = display;
      }
    }
  }
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
}: MapCanvasProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const svgHostRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const markerLayerRef = useRef<SVGSVGElement>(null);
  const floorIdRef = useRef(floorId);
  const onFloorChangeRef = useRef(onFloorChange);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewBox, setViewBox] = useState<ViewBox>(DEFAULT_VIEW_BOX);
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

  // Store original viewBox for zoom clamping calculation
  const originalViewBoxRef = useRef<ViewBox>(DEFAULT_VIEW_BOX);

  // Track previous floor and its original viewBox for proportional mapping
  const previousFloorIdRef = useRef<string>(floorId);
  const previousOriginalViewBoxRef = useRef<ViewBox>(DEFAULT_VIEW_BOX);

  // Pointer tracking for pan and pinch
  const gestureRef = useRef<{
    isPanning: boolean;
    isPinching: boolean;
    pointerX: number;
    pointerY: number;
    startViewBox: ViewBox;
    pinchStartDistance?: number;
    pinchCenter?: { x: number; y: number };
  }>({
    isPanning: false,
    isPinching: false,
    pointerX: 0,
    pointerY: 0,
    startViewBox: DEFAULT_VIEW_BOX,
  });

  // Resolve floorId to a sheet and load its SVG. The text cache avoids repeat fetches.
  useEffect(() => {
    let cancelled = false;
    const listenerCleanups: Array<() => void> = [];
    const svgHost = svgHostRef.current;

    setError(null);
    if (!sheet) {
      svgRef.current = null;
      if (svgHost) {
        svgHost.replaceChildren();
      }
      setError(`Floor "${floorIdRef.current}" not found`);
      setLoading(false);
      return;
    }

    setLoading(true);
    svgRef.current = null;
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
        setLectureHallFloor(svgElement, floorIdRef.current);

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

  // LH uses one sheet for both floors, so switching floors only changes its SVG groups.
  useEffect(() => {
    if (svgRef.current) {
      setLectureHallFloor(svgRef.current, floorId);
    }
  }, [floorId]);

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
  }, [viewBox]);

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

  // 元地図とは独立した overlay SVG の DOM を、表示状態ごとに同期する。
  useEffect(() => {
    const markerLayer = markerLayerRef.current;
    const svgElement = svgRef.current;
    const listenerCleanups: Array<() => void> = [];
    markerLayer?.replaceChildren();
    if (!markerLayer || !svgElement || loading) {
      return;
    }

    const originalWidth = originalViewBoxRef.current.width;
    const zoomScale = originalWidth / viewBox.width;
    const inverseZoomScale = 1 / zoomScale;
    const baseMarkerScale = originalWidth / MARKER_REFERENCE_WIDTH;
    const markerScale = inverseZoomScale * baseMarkerScale;
    const eventByPlaceId = new Map<string, CampusEvent>();
    const pinPlaceIds = new Set(
      [currentPlace, destinationPlace, focusPlace]
        .filter((place): place is Place => place !== null)
        .map((place) => place.id),
    );

    for (const event of events) {
      if (!eventByPlaceId.has(event.placeId)) {
        eventByPlaceId.set(event.placeId, event);
      }
    }

    // イベントを先に描画し、現在地・目的地・注目ピンを常に前面に保つ。
    for (const [placeId, event] of eventByPlaceId) {
      const place = getPlace(placeId);
      if (!place || place.floorId !== floorId || pinPlaceIds.has(placeId)) {
        continue;
      }

      const coordinates = getPlaceCoordinates(place, svgElement);
      if (!coordinates) {
        continue;
      }

      const group = document.createElementNS(SVG_NAMESPACE, "g");
      const hitArea = document.createElementNS(SVG_NAMESPACE, "rect");
      const backgroundPath = document.createElementNS(SVG_NAMESPACE, "path");
      const path = document.createElementNS(SVG_NAMESPACE, "path");
      const markerLabel = `${place.name}のイベントを表示: ${event.title}`;
      const openEvent = () => {
        const searchParams = new URLSearchParams(location.search);
        searchParams.set("highlight", event.id);
        void navigate({
          pathname: "/events",
          search: `?${searchParams.toString()}`,
        });
      };
      const openEventWithKeyboard = (keyboardEvent: KeyboardEvent) => {
        if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") {
          keyboardEvent.preventDefault();
          openEvent();
        }
      };
      const stopMapGesture = (pointerEvent: PointerEvent) => {
        pointerEvent.stopPropagation();
      };

      // バッジ下端の突起(11, 25)を地点座標に合わせる
      group.setAttribute(
        "transform",
        `translate(${coordinates.x} ${coordinates.y}) scale(${markerScale * EVENT_MARKER_SCALE}) translate(-11 -25)`,
      );
      group.setAttribute("class", "map-marker map-marker--event");
      group.setAttribute("data-place-id", place.id);
      group.setAttribute("data-event-id", event.id);
      group.setAttribute("role", "button");
      group.setAttribute("tabindex", "0");
      group.setAttribute("aria-label", markerLabel);
      hitArea.setAttribute("class", "map-marker__hit-area");
      hitArea.setAttribute("x", "-4");
      hitArea.setAttribute("y", "-4");
      hitArea.setAttribute("width", "30");
      hitArea.setAttribute("height", "33");
      hitArea.setAttribute("rx", "6");
      backgroundPath.setAttribute("class", "map-marker__event-background");
      backgroundPath.setAttribute("d", EVENT_MARKER_BACKGROUND_PATH);
      path.setAttribute("class", "map-marker__event-shape");
      path.setAttribute("d", EVENT_MARKER_PATH);
      group.append(hitArea, backgroundPath, path);
      group.addEventListener("pointerdown", stopMapGesture);
      group.addEventListener("click", openEvent);
      group.addEventListener("keydown", openEventWithKeyboard);
      listenerCleanups.push(() => {
        group.removeEventListener("pointerdown", stopMapGesture);
        group.removeEventListener("click", openEvent);
        group.removeEventListener("keydown", openEventWithKeyboard);
      });
      markerLayer.append(group);
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
        `translate(${coordinates.x} ${coordinates.y}) scale(${markerScale}) translate(-25 -45.83)`,
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
    if (!containerRef.current || gestureRef.current.isPinching) return;
    gestureRef.current.isPanning = true;
    gestureRef.current.pointerX = event.clientX;
    gestureRef.current.pointerY = event.clientY;
    gestureRef.current.startViewBox = { ...viewBox };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (
      gestureRef.current.isPinching ||
      !gestureRef.current.isPanning ||
      !containerRef.current
    ) {
      return;
    }

    const rect = containerRef.current.getBoundingClientRect();
    const dx = event.clientX - gestureRef.current.pointerX;
    const dy = event.clientY - gestureRef.current.pointerY;

    const deltaX = -(dx / rect.width) * viewBox.width;
    const deltaY = -(dy / rect.height) * viewBox.height;

    setViewBox({
      ...viewBox,
      x: gestureRef.current.startViewBox.x + deltaX,
      y: gestureRef.current.startViewBox.y + deltaY,
    });
  };

  const handlePointerUp = () => {
    gestureRef.current.isPanning = false;
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
            {selectableFloorIds.map((selectableFloorId) => (
              <button
                key={selectableFloorId}
                type="button"
                className="map-canvas__floor-button"
                aria-pressed={selectableFloorId === floorId}
                onClick={() => onFloorChange(selectableFloorId)}
              >
                {getFloorLabel(selectableFloorId)}
              </button>
            ))}
          </div>
        )}
        {floorId !== DEFAULT_FLOOR_ID && (
          <button
            type="button"
            className="map-canvas__campus-button"
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
