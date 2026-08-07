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
  getReleaseBottomSheetSnapPoint,
  initialBottomSheetSnapPoint,
} from "./bottomSheetGeometry";
import type { BottomSheetSnapPoint } from "./bottomSheetGeometry";
import { SheetNavigation } from "./SheetNavigation";

type BottomSheetProps = {
  children: ReactNode;
  expandRequestKey: string | null;
  onHeightChange: (height: number) => void;
  snapRequest: { key: number; snapPoint: BottomSheetSnapPoint } | null;
  topOverlay?: ReactNode;
};

type PointerMoveSample = {
  position: number;
  timestamp: number;
};

const RELEASE_VELOCITY_SAMPLE_WINDOW_MS = 100;

function getReleaseVelocity(
  samples: PointerMoveSample[],
  releaseTimestamp: number,
): number {
  const recentSamples = samples.filter(
    ({ timestamp }) =>
      timestamp <= releaseTimestamp &&
      releaseTimestamp - timestamp <= RELEASE_VELOCITY_SAMPLE_WINDOW_MS,
  );
  const firstSample = recentSamples[0];
  const lastSample = recentSamples[recentSamples.length - 1];

  if (!firstSample || !lastSample || firstSample === lastSample) {
    return 0;
  }

  const elapsed = lastSample.timestamp - firstSample.timestamp;
  return elapsed > 0
    ? (lastSample.position - firstSample.position) / elapsed
    : 0;
}

export function BottomSheet({
  children,
  expandRequestKey,
  onHeightChange,
  snapRequest,
  topOverlay,
}: BottomSheetProps) {
  const [height, setHeight] = useState(initialBottomSheetSnapPoint);
  const [isDragging, setIsDragging] = useState(false);
  const dragState = useRef({
    startY: 0,
    startHeight: initialBottomSheetSnapPoint,
    viewportHeight: 1,
    samples: [] as PointerMoveSample[],
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
      samples: [],
    };
    setIsDragging(true);
  };

  const dragSheet = (event: PointerEvent<HTMLDivElement>) => {
    if (!isDragging) {
      return;
    }

    const sample = {
      position: event.clientY,
      timestamp: event.timeStamp,
    };
    dragState.current.samples = [
      ...dragState.current.samples.filter(
        ({ timestamp }) =>
          sample.timestamp - timestamp <= RELEASE_VELOCITY_SAMPLE_WINDOW_MS,
      ),
      sample,
    ];
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

  const stopDrag = (event: PointerEvent<HTMLDivElement>) => {
    const velocity = getReleaseVelocity(
      dragState.current.samples,
      event.timeStamp,
    );
    dragState.current.samples = [];
    setIsDragging(false);
    setHeight((currentHeight) =>
      getReleaseBottomSheetSnapPoint({
        height: currentHeight,
        velocity,
      }),
    );
  };

  const cancelDrag = () => {
    dragState.current.samples = [];
    setIsDragging(false);
    setHeight(getNearestBottomSheetSnapPoint);
  };

  return (
    <section className={isDragging ? "bottom-sheet is-dragging" : "bottom-sheet"} aria-label="Map controls">
      {topOverlay && <div className="bottom-sheet__top-overlay">{topOverlay}</div>}
      <div className="bottom-sheet__surface">
        <div
          className="bottom-sheet__drag-zone"
          onPointerDown={startDrag}
          onPointerMove={dragSheet}
          onPointerUp={stopDrag}
          onPointerCancel={cancelDrag}
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
      </div>
    </section>
  );
}
