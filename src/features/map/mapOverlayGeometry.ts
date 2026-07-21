export interface OverlayPoint {
  x: number;
  y: number;
}

export interface OverlayBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export function getAnchoredOverlayTransform(
  anchor: OverlayPoint,
  userUnitsPerPixel: number,
  localAnchor: OverlayPoint,
): string {
  return `translate(${anchor.x} ${anchor.y}) scale(${userUnitsPerPixel}) translate(-${localAnchor.x} -${localAnchor.y})`;
}

export function mapAnchoredLocalPoint(
  point: OverlayPoint,
  anchor: OverlayPoint,
  userUnitsPerPixel: number,
  localAnchor: OverlayPoint,
): OverlayPoint {
  return {
    x: anchor.x + (point.x - localAnchor.x) * userUnitsPerPixel,
    y: anchor.y + (point.y - localAnchor.y) * userUnitsPerPixel,
  };
}

export function getAnchoredOverlayBounds(
  localBounds: OverlayBounds,
  anchor: OverlayPoint,
  userUnitsPerPixel: number,
  localAnchor: OverlayPoint,
  paddingPx = 0,
): OverlayBounds {
  const padding = paddingPx * userUnitsPerPixel;
  const topLeft = mapAnchoredLocalPoint(
    { x: localBounds.left, y: localBounds.top },
    anchor,
    userUnitsPerPixel,
    localAnchor,
  );
  const bottomRight = mapAnchoredLocalPoint(
    { x: localBounds.right, y: localBounds.bottom },
    anchor,
    userUnitsPerPixel,
    localAnchor,
  );

  return {
    left: Math.min(topLeft.x, bottomRight.x) - padding,
    top: Math.min(topLeft.y, bottomRight.y) - padding,
    right: Math.max(topLeft.x, bottomRight.x) + padding,
    bottom: Math.max(topLeft.y, bottomRight.y) + padding,
  };
}

export function getCenteredLineOffsetsEm(
  lineOffsetsEm: number[],
  lineCount: number,
  fallbackLineHeight = 1.2,
): number[] {
  if (lineCount <= 0) {
    return [];
  }

  const resolvedOffsets: number[] = [];
  for (let index = 0; index < lineCount; index += 1) {
    const suppliedOffset = lineOffsetsEm[index];
    const previousOffset = resolvedOffsets[index - 1] ?? 0;
    resolvedOffsets.push(
      Number.isFinite(suppliedOffset) &&
        (index === 0 || suppliedOffset > previousOffset)
        ? suppliedOffset
        : index === 0
          ? 0
          : previousOffset + fallbackLineHeight,
    );
  }

  const firstOffset = resolvedOffsets[0] ?? 0;
  const lastOffset = resolvedOffsets[resolvedOffsets.length - 1] ?? firstOffset;
  const centerOffset = (firstOffset + lastOffset) / 2;
  return resolvedOffsets.map((offset) => offset - centerOffset);
}

export function getCenteredLabelBounds(
  center: OverlayPoint,
  lines: string[],
  centeredLineOffsetsEm: number[],
  fontSize: number,
  characterWidthEm: number,
  padding: number,
): OverlayBounds {
  const longestLineLength = Math.max(
    1,
    ...lines.map((line) => Array.from(line).length),
  );
  const width = longestLineLength * fontSize * characterWidthEm;
  const firstOffset = centeredLineOffsetsEm[0] ?? 0;
  const lastOffset =
    centeredLineOffsetsEm[centeredLineOffsetsEm.length - 1] ?? firstOffset;

  return {
    left: center.x - width / 2 - padding,
    top: center.y + (firstOffset - 0.5) * fontSize - padding,
    right: center.x + width / 2 + padding,
    bottom: center.y + (lastOffset + 0.5) * fontSize + padding,
  };
}

export function overlayBoundsIntersect(
  first: OverlayBounds,
  second: OverlayBounds,
): boolean {
  return (
    first.left < second.right &&
    first.right > second.left &&
    first.top < second.bottom &&
    first.bottom > second.top
  );
}

export function isOverlayBoundsExcluded(
  bounds: OverlayBounds,
  exclusionBounds: OverlayBounds[],
): boolean {
  return exclusionBounds.some((exclusion) =>
    overlayBoundsIntersect(bounds, exclusion),
  );
}
