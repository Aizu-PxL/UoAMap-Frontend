export type MapViewBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type MapPoint = {
  x: number;
  y: number;
};

type MapViewBoxAttributes = {
  viewBox: string | null;
  width: string | null;
  height: string | null;
};

function extractNumericValue(value: string | null): number | null {
  if (!value) return null;
  const number = Number.parseFloat(value);
  return Number.isFinite(number) ? number : null;
}

export function parseMapViewBox({
  viewBox,
  width,
  height,
}: MapViewBoxAttributes): MapViewBox {
  if (viewBox !== null) {
    const values = viewBox.trim().split(/[\s,]+/).map(Number);
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

  const numericWidth = extractNumericValue(width);
  const numericHeight = extractNumericValue(height);
  if (
    numericWidth !== null &&
    numericWidth > 0 &&
    numericHeight !== null &&
    numericHeight > 0
  ) {
    return { x: 0, y: 0, width: numericWidth, height: numericHeight };
  }
  throw new Error("Invalid SVG viewBox");
}

const MAX_ZOOM_SCALE = 6;

function clampMapViewBoxSize(width: number, original: MapViewBox) {
  const clampedWidth = Math.min(
    Math.max(width, original.width / MAX_ZOOM_SCALE),
    original.width * 2,
  );
  return {
    width: clampedWidth,
    height: original.height * (clampedWidth / original.width),
  };
}

export function clampMapViewBoxPosition(
  viewBox: MapViewBox,
  original: MapViewBox,
): MapViewBox {
  const clampAxis = (
    position: number,
    size: number,
    originalPosition: number,
    originalSize: number,
  ) =>
    size >= originalSize
      ? originalPosition - (size - originalSize) / 2
      : Math.min(
          Math.max(position, originalPosition),
          originalPosition + originalSize - size,
        );

  return {
    ...viewBox,
    x: clampAxis(viewBox.x, viewBox.width, original.x, original.width),
    y: clampAxis(viewBox.y, viewBox.height, original.y, original.height),
  };
}

export function focusMapViewBox(
  original: MapViewBox,
  point: MapPoint,
  sizeRatio: number,
  verticalAnchor: number,
): MapViewBox {
  const width = original.width * sizeRatio;
  const height = original.height * sizeRatio;
  return clampMapViewBoxPosition({
    x: point.x - width / 2,
    y: point.y - height * verticalAnchor,
    width,
    height,
  }, original);
}

export function zoomMapViewBoxAt(
  current: MapViewBox,
  original: MapViewBox,
  anchor: MapPoint,
  zoomFactor: number,
): MapViewBox {
  const anchorX = (anchor.x - current.x) / current.width;
  const anchorY = (anchor.y - current.y) / current.height;
  const { width, height } = clampMapViewBoxSize(
    current.width * zoomFactor,
    original,
  );
  return clampMapViewBoxPosition({
    x: anchor.x - anchorX * width,
    y: anchor.y - anchorY * height,
    width,
    height,
  }, original);
}

export function panMapViewBox(
  start: MapViewBox,
  startPoint: MapPoint,
  currentPoint: MapPoint,
  original: MapViewBox,
): MapViewBox {
  return clampMapViewBoxPosition({
    ...start,
    x: start.x + startPoint.x - currentPoint.x,
    y: start.y + startPoint.y - currentPoint.y,
  }, original);
}

export function getProportionalMapViewBox(
  current: MapViewBox,
  previousOriginal: MapViewBox,
  nextOriginal: MapViewBox,
): MapViewBox {
  const centerXRatio =
    (current.x + current.width / 2 - previousOriginal.x) /
    previousOriginal.width;
  const centerYRatio =
    (current.y + current.height / 2 - previousOriginal.y) /
    previousOriginal.height;
  const width = (current.width / previousOriginal.width) * nextOriginal.width;
  const height = (current.height / previousOriginal.height) * nextOriginal.height;
  const centerX = nextOriginal.x + centerXRatio * nextOriginal.width;
  const centerY = nextOriginal.y + centerYRatio * nextOriginal.height;
  return clampMapViewBoxPosition({
    x: centerX - width / 2,
    y: centerY - height / 2,
    width,
    height,
  }, nextOriginal);
}

export function serializeMapViewBox(viewBox: MapViewBox) {
  return `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`;
}
