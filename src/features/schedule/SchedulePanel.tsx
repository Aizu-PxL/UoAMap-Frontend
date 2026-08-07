import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  clampScheduleScale,
  getNextScheduleScale,
  getPinchScheduleScale,
  getScheduleFocalScroll,
  getScheduleZoomAnchor,
  SCHEDULE_MIN_SCALE,
  SCHEDULE_MAX_SCALE,
} from "./scheduleZoom";

const scheduleImageUrl = `${import.meta.env.BASE_URL ?? "/"}schedule/ocschedule2026.png`;

type PointerPoint = {
  x: number;
  y: number;
};

/**
 * ズームの基準点。`anchor*` は画像左上を原点とする等倍座標、`scrollOrigin*` は
 * 「変形前の画像原点のクライアント座標 + スクロール位置」で、transform はレイアウトを
 * 変えないためジェスチャ中は一定になる。
 */
type ScheduleZoomFocus = {
  scrollOriginX: number;
  scrollOriginY: number;
  anchorX: number;
  anchorY: number;
};

type ScheduleGesture =
  | {
      kind: "drag";
      startX: number;
      startY: number;
      startScrollLeft: number;
      startScrollTop: number;
    }
  | ({
      kind: "pinch";
      initialDistance: number;
      initialScale: number;
    } & ScheduleZoomFocus);

function getPointerDistance(points: Iterable<PointerPoint>): number | null {
  const [first, second] = [...points];
  if (!first || !second) {
    return null;
  }

  return Math.hypot(second.x - first.x, second.y - first.y);
}

function getPointerMidpoint(points: Iterable<PointerPoint>): PointerPoint | null {
  const [first, second] = [...points];
  if (!first || !second) {
    return null;
  }

  return { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
}

export function SchedulePanel() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [scale, setScale] = useState(1);
  const viewportRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const pointersRef = useRef(new Map<number, PointerPoint>());
  const gestureRef = useRef<ScheduleGesture | null>(null);
  const pendingScrollRef = useRef<{ left: number; top: number } | null>(null);

  const clearGesture = () => {
    pointersRef.current.clear();
    gestureRef.current = null;
    pendingScrollRef.current = null;
  };

  /** 焦点(ピンチ中心・表示中央)を、倍率が変わっても保てる形で測る */
  const measureZoomFocus = (focal: PointerPoint): ScheduleZoomFocus | null => {
    const viewport = viewportRef.current;
    const image = imageRef.current;
    if (!viewport || !image) {
      return null;
    }

    const imageRect = image.getBoundingClientRect();
    const currentScale = clampScheduleScale(scale);
    return {
      scrollOriginX: imageRect.left + viewport.scrollLeft,
      scrollOriginY: imageRect.top + viewport.scrollTop,
      anchorX: getScheduleZoomAnchor(focal.x, imageRect.left, currentScale),
      anchorY: getScheduleZoomAnchor(focal.y, imageRect.top, currentScale),
    };
  };

  const getFocalScroll = (focus: ScheduleZoomFocus, nextScale: number, focal: PointerPoint) => ({
    left: getScheduleFocalScroll(focus.scrollOriginX, focus.anchorX, nextScale, focal.x),
    top: getScheduleFocalScroll(focus.scrollOriginY, focus.anchorY, nextScale, focal.y),
  });

  /** 倍率変更でスクロール可能域が広がった後に補正したいので、DOM反映後(描画前)に適用する */
  useLayoutEffect(() => {
    const pending = pendingScrollRef.current;
    pendingScrollRef.current = null;
    const viewport = viewportRef.current;
    if (!pending || !viewport) {
      return;
    }

    viewport.scrollLeft = pending.left;
    viewport.scrollTop = pending.top;
  }, [scale]);

  const zoomWithButton = (direction: "in" | "out") => {
    const viewport = viewportRef.current;
    const nextScale = getNextScheduleScale(scale, direction);
    if (!viewport || nextScale === scale) {
      return;
    }

    const viewportRect = viewport.getBoundingClientRect();
    const center = {
      x: viewportRect.left + viewport.clientWidth / 2,
      y: viewportRect.top + viewport.clientHeight / 2,
    };
    const focus = measureZoomFocus(center);
    pendingScrollRef.current = focus ? getFocalScroll(focus, nextScale, center) : null;
    setScale(nextScale);
  };

  const closeDialog = () => {
    clearGesture();
    setScale(1);
    setIsExpanded(false);
  };

  const openDialog = () => {
    clearGesture();
    setScale(1);
    setIsExpanded(true);
  };

  useEffect(() => {
    if (!isExpanded) {
      return;
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsExpanded(false);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isExpanded]);

  return (
    <div className="schedule-panel">
      <h2>タイムスケジュール</h2>
      <button
        className="schedule-panel__open"
        type="button"
        aria-label="タイムスケジュールを拡大表示"
        onClick={openDialog}
      >
        <img
          src={scheduleImageUrl}
          alt="オープンキャンパス2026 夏ステージ タイムスケジュール（8:30〜15:00）"
        />
      </button>
      {isExpanded
        ? createPortal(
            <div
              className="schedule-dialog"
              role="dialog"
              aria-modal="true"
              aria-label="拡大タイムスケジュール"
              onClick={(event) => {
                if (event.target === event.currentTarget) {
                  closeDialog();
                }
              }}
            >
              <div className="schedule-dialog__toolbar">
                <div className="schedule-dialog__zoom-controls" aria-label="スケジュール画像の拡大縮小">
                  <button
                    className="schedule-dialog__zoom-button"
                    type="button"
                    aria-label="スケジュール画像を縮小"
                    disabled={scale <= SCHEDULE_MIN_SCALE}
                    onClick={() => zoomWithButton("out")}
                  >
                    −
                  </button>
                  <output className="schedule-dialog__zoom-level" aria-live="polite">
                    {Math.round(scale * 100)}%
                  </output>
                  <button
                    className="schedule-dialog__zoom-button"
                    type="button"
                    aria-label="スケジュール画像を拡大"
                    disabled={scale >= SCHEDULE_MAX_SCALE}
                    onClick={() => zoomWithButton("in")}
                  >
                    ＋
                  </button>
                </div>
                <button
                  className="schedule-dialog__close"
                  type="button"
                  onClick={closeDialog}
                >
                  閉じる
                </button>
              </div>
              <div
                ref={viewportRef}
                className="schedule-dialog__viewport"
                onPointerDown={(event) => {
                  if (event.pointerType === "mouse" && event.button !== 0) {
                    return;
                  }

                  const viewport = viewportRef.current;
                  if (!viewport) {
                    return;
                  }

                  viewport.setPointerCapture(event.pointerId);
                  pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

                  if (pointersRef.current.size === 1) {
                    gestureRef.current = {
                      kind: "drag",
                      startX: event.clientX,
                      startY: event.clientY,
                      startScrollLeft: viewport.scrollLeft,
                      startScrollTop: viewport.scrollTop,
                    };
                  } else if (pointersRef.current.size === 2) {
                    const initialDistance = getPointerDistance(pointersRef.current.values());
                    const midpoint = getPointerMidpoint(pointersRef.current.values());
                    const focus = midpoint ? measureZoomFocus(midpoint) : null;
                    if (initialDistance && focus) {
                      gestureRef.current = {
                        kind: "pinch",
                        initialDistance,
                        initialScale: scale,
                        ...focus,
                      };
                    }
                  }
                }}
                onPointerMove={(event) => {
                  const viewport = viewportRef.current;
                  const currentPointer = pointersRef.current.get(event.pointerId);
                  if (!viewport || !currentPointer) {
                    return;
                  }

                  currentPointer.x = event.clientX;
                  currentPointer.y = event.clientY;

                  if (pointersRef.current.size >= 2 && gestureRef.current?.kind === "pinch") {
                    const gesture = gestureRef.current;
                    const currentDistance = getPointerDistance(pointersRef.current.values());
                    const midpoint = getPointerMidpoint(pointersRef.current.values());
                    if (currentDistance && midpoint) {
                      const nextScale = getPinchScheduleScale(
                        gesture.initialScale,
                        gesture.initialDistance,
                        currentDistance,
                      );
                      // アンカーはピンチ開始時のまま固定するので、指の中心が動けば画像もついてくる
                      const nextScroll = getFocalScroll(gesture, nextScale, midpoint);
                      if (nextScale === scale) {
                        // 倍率が上下限に張り付いている間は再レンダリングされないため、その場で反映する
                        viewport.scrollLeft = nextScroll.left;
                        viewport.scrollTop = nextScroll.top;
                      } else {
                        pendingScrollRef.current = nextScroll;
                        setScale(nextScale);
                      }
                      event.preventDefault();
                    }
                    return;
                  }

                  if (pointersRef.current.size === 1 && gestureRef.current?.kind === "drag") {
                    viewport.scrollLeft = gestureRef.current.startScrollLeft - (event.clientX - gestureRef.current.startX);
                    viewport.scrollTop = gestureRef.current.startScrollTop - (event.clientY - gestureRef.current.startY);
                    event.preventDefault();
                  }
                }}
                onPointerUp={(event) => {
                  pointersRef.current.delete(event.pointerId);
                  if (viewportRef.current?.hasPointerCapture(event.pointerId)) {
                    viewportRef.current.releasePointerCapture(event.pointerId);
                  }

                  if (pointersRef.current.size === 0) {
                    gestureRef.current = null;
                  } else if (pointersRef.current.size === 1 && viewportRef.current) {
                    const [remaining] = pointersRef.current.values();
                    if (remaining) {
                      gestureRef.current = {
                        kind: "drag",
                        startX: remaining.x,
                        startY: remaining.y,
                        startScrollLeft: viewportRef.current.scrollLeft,
                        startScrollTop: viewportRef.current.scrollTop,
                      };
                    }
                  }
                }}
                onPointerCancel={(event) => {
                  pointersRef.current.delete(event.pointerId);
                  if (viewportRef.current?.hasPointerCapture(event.pointerId)) {
                    viewportRef.current.releasePointerCapture(event.pointerId);
                  }
                  gestureRef.current = null;
                }}
                onClick={(event) => {
                  if (event.target === event.currentTarget) {
                    closeDialog();
                  }
                }}
              >
                <img
                  ref={imageRef}
                  src={scheduleImageUrl}
                  alt="オープンキャンパス2026 夏ステージ タイムスケジュール拡大画像"
                  draggable="false"
                  style={{ transform: `scale(${clampScheduleScale(scale)})` }}
                />
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
