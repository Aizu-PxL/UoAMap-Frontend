export const bottomSheetSnapPoints = [22, 58, 82] as const;
export type BottomSheetSnapPoint = (typeof bottomSheetSnapPoints)[number];
export const initialBottomSheetSnapPoint = 58;
export const BOTTOM_SHEET_FLING_VELOCITY_THRESHOLD_PX_PER_MS = 0.5;

export function clampBottomSheetHeight(value: number): number {
  return Math.min(
    Math.max(value, bottomSheetSnapPoints[0]),
    bottomSheetSnapPoints[bottomSheetSnapPoints.length - 1],
  );
}

export function getBottomSheetDragHeight({
  startY,
  clientY,
  startHeight,
  viewportHeight,
}: {
  startY: number;
  clientY: number;
  startHeight: number;
  viewportHeight: number;
}): number {
  const delta = ((startY - clientY) / (viewportHeight || 1)) * 100;
  return clampBottomSheetHeight(startHeight + delta);
}

export function getNearestBottomSheetSnapPoint(
  value: number,
): BottomSheetSnapPoint {
  return bottomSheetSnapPoints.reduce((nearest, point) =>
    Math.abs(point - value) < Math.abs(nearest - value) ? point : nearest,
  );
}

export function getReleaseBottomSheetSnapPoint({
  height,
  velocity,
}: {
  height: number;
  velocity: number;
}): BottomSheetSnapPoint {
  if (velocity > BOTTOM_SHEET_FLING_VELOCITY_THRESHOLD_PX_PER_MS) {
    return bottomSheetSnapPoints[0];
  }

  if (velocity < -BOTTOM_SHEET_FLING_VELOCITY_THRESHOLD_PX_PER_MS) {
    return bottomSheetSnapPoints[bottomSheetSnapPoints.length - 1];
  }

  return getNearestBottomSheetSnapPoint(height);
}

export function getNextBottomSheetSnapPoint(value: number): number {
  const currentIndex = bottomSheetSnapPoints.findIndex(
    (point) => point === getNearestBottomSheetSnapPoint(value),
  );
  return bottomSheetSnapPoints[(currentIndex + 1) % bottomSheetSnapPoints.length];
}

export function getExpandedBottomSheetHeight(value: number): number {
  return Math.max(value, initialBottomSheetSnapPoint);
}
