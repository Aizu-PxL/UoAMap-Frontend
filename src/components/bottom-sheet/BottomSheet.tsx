import { type CSSProperties, type PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { MapPanel } from "./MapPanel";
import { QrPanel } from "./QrPanel";
import { SearchPanel } from "./SearchPanel";
import { SheetNavigation } from "./SheetNavigation";
import type { BottomSheetTab } from "./types";

type BottomSheetProps = {
  activeTab: BottomSheetTab;
  onTabChange: (tab: BottomSheetTab) => void;
};

const snapPoints = [22, 58, 82] as const;
const initialSnapPoint = 58;

export function BottomSheet({ activeTab, onTabChange }: BottomSheetProps) {
  const [height, setHeight] = useState(initialSnapPoint);
  const [isDragging, setIsDragging] = useState(false);
  const dragState = useRef({ startY: 0, startHeight: initialSnapPoint, viewportHeight: 1 });

  const sheetStyle = useMemo(
    () =>
      ({
        "--bottom-sheet-height": `${height}svh`,
      }) as CSSProperties,
    [height],
  );

  useEffect(() => {
    const moveDrag = (event: globalThis.PointerEvent) => {
      if (!isDragging) {
        return;
      }

      dragTo(event.clientY);
    };

    const stopDrag = () => {
      if (!isDragging) {
        return;
      }

      setIsDragging(false);
      setHeight((currentHeight) => nearestSnapPoint(currentHeight));
    };

    window.addEventListener("pointermove", moveDrag);
    window.addEventListener("pointerup", stopDrag);
    window.addEventListener("pointercancel", stopDrag);

    return () => {
      window.removeEventListener("pointermove", moveDrag);
      window.removeEventListener("pointerup", stopDrag);
      window.removeEventListener("pointercancel", stopDrag);
    };
  }, [isDragging]);

  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragState.current = {
      startY: event.clientY,
      startHeight: height,
      viewportHeight: window.innerHeight || 1,
    };
    setIsDragging(true);
  };

  const dragSheet = (event: PointerEvent<HTMLDivElement>) => {
    if (!isDragging) {
      return;
    }

    dragTo(event.clientY);
  };

  const dragTo = (clientY: number) => {
    const { startY, startHeight, viewportHeight } = dragState.current;
    const delta = ((startY - clientY) / viewportHeight) * 100;
    setHeight(clamp(startHeight + delta, snapPoints[0], snapPoints[snapPoints.length - 1]));
  };

  const stopDrag = () => {
    setIsDragging(false);
    setHeight((currentHeight) => nearestSnapPoint(currentHeight));
  };

  return (
    <section className={isDragging ? "bottom-sheet is-dragging" : "bottom-sheet"} style={sheetStyle} aria-label="Map controls">
      <div
        className="bottom-sheet__drag-zone"
        onPointerDown={startDrag}
        onPointerMove={dragSheet}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
        onDoubleClick={() => setHeight((currentHeight) => nextSnapPoint(currentHeight))}
        role="presentation"
      >
        <div className="bottom-sheet__handle" aria-hidden="true" />
      </div>
      <SheetNavigation
        activeTab={activeTab}
        onTabChange={(tab) => {
          onTabChange(tab);
          setHeight((currentHeight) => Math.max(currentHeight, initialSnapPoint));
        }}
      />
      <div className="bottom-sheet__body">
        {activeTab === "search" && <SearchPanel />}
        {activeTab === "qr" && <QrPanel />}
        {activeTab === "map" && <MapPanel />}
      </div>
    </section>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function nearestSnapPoint(value: number) {
  return snapPoints.reduce((nearest, point) => (Math.abs(point - value) < Math.abs(nearest - value) ? point : nearest));
}

function nextSnapPoint(value: number) {
  const currentIndex = snapPoints.findIndex((point) => point === nearestSnapPoint(value));
  return snapPoints[(currentIndex + 1) % snapPoints.length];
}
