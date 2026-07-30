import {
  type PointerEvent,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  getBottomSheetDragHeight,
  getExpandedBottomSheetHeight,
  getNearestBottomSheetSnapPoint,
  getNextBottomSheetSnapPoint,
  initialBottomSheetSnapPoint,
} from "./bottomSheetGeometry";
import type { BottomSheetSnapPoint } from "./bottomSheetGeometry";
import { SheetNavigation } from "./SheetNavigation";

type BottomSheetProps = {
  children: ReactNode;
  expandRequestKey: string | null;
  onHeightChange: (height: number) => void;
  snapRequest: { key: number; snapPoint: BottomSheetSnapPoint } | null;
};

export function BottomSheet({
  children,
  expandRequestKey,
  onHeightChange,
  snapRequest,
}: BottomSheetProps) {
  const [height, setHeight] = useState(initialBottomSheetSnapPoint);
  const [isDragging, setIsDragging] = useState(false);
  const dragState = useRef({
    startY: 0,
    startHeight: initialBottomSheetSnapPoint,
    viewportHeight: 1,
  });

  useLayoutEffect(() => {
    onHeightChange(height);
  }, [height, onHeightChange]);

  useEffect(() => {
    if (expandRequestKey) {
      setHeight(getExpandedBottomSheetHeight);
    }
  }, [expandRequestKey]);

  useEffect(() => {
    if (snapRequest) {
      setHeight(snapRequest.snapPoint);
    }
  }, [snapRequest]);

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
    setHeight(
      getBottomSheetDragHeight({
        ...dragState.current,
        clientY,
      }),
    );
  };

  const stopDrag = () => {
    setIsDragging(false);
    setHeight(getNearestBottomSheetSnapPoint);
  };

  return (
    <section className={isDragging ? "bottom-sheet is-dragging" : "bottom-sheet"} aria-label="Map controls">
      <div
        className="bottom-sheet__drag-zone"
        onPointerDown={startDrag}
        onPointerMove={dragSheet}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
        onDoubleClick={() => setHeight(getNextBottomSheetSnapPoint)}
        role="presentation"
      >
        <div className="bottom-sheet__handle" aria-hidden="true" />
      </div>
      <SheetNavigation
        onNavigate={(tabId) => {
          setHeight(tabId === "qr" ? 82 : getExpandedBottomSheetHeight);
        }}
      />
      <div className="bottom-sheet__body">{children}</div>
    </section>
  );
}
