import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  clampScheduleScale,
  getNextScheduleScale,
  getPinchScheduleScale,
  SCHEDULE_MIN_SCALE,
  SCHEDULE_MAX_SCALE,
} from "./scheduleZoom";

const scheduleImageUrl = `${import.meta.env.BASE_URL ?? "/"}schedule/ocschedule2026.png`;

type PointerPoint = {
  x: number;
  y: number;
};

type ScheduleGesture =
  | {
      kind: "drag";
      startX: number;
      startY: number;
      startScrollLeft: number;
      startScrollTop: number;
    }
  | {
      kind: "pinch";
      initialDistance: number;
      initialScale: number;
    };

function getPointerDistance(points: Iterable<PointerPoint>): number | null {
  const [first, second] = [...points];
  if (!first || !second) {
    return null;
  }

  return Math.hypot(second.x - first.x, second.y - first.y);
}

export function SchedulePanel() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [scale, setScale] = useState(1);
  const viewportRef = useRef<HTMLDivElement>(null);
  const pointersRef = useRef(new Map<number, PointerPoint>());
  const gestureRef = useRef<ScheduleGesture | null>(null);

  const clearGesture = () => {
    pointersRef.current.clear();
    gestureRef.current = null;
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
                    onClick={() => setScale((currentScale) => getNextScheduleScale(currentScale, "out"))}
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
                    onClick={() => setScale((currentScale) => getNextScheduleScale(currentScale, "in"))}
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
                    if (initialDistance) {
                      gestureRef.current = { kind: "pinch", initialDistance, initialScale: scale };
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
                    const currentDistance = getPointerDistance(pointersRef.current.values());
                    if (currentDistance) {
                      setScale(
                        getPinchScheduleScale(
                          gestureRef.current.initialScale,
                          gestureRef.current.initialDistance,
                          currentDistance,
                        ),
                      );
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
