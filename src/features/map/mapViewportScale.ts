interface Dimensions {
  width: number;
  height: number;
}

function hasPositiveFiniteDimensions(dimensions: Dimensions): boolean {
  return (
    Number.isFinite(dimensions.width) &&
    Number.isFinite(dimensions.height) &&
    dimensions.width > 0 &&
    dimensions.height > 0
  );
}

/**
 * `preserveAspectRatio="xMidYMid meet"` で1画面pxが何SVG user単位に相当するかを返す。
 * meetは幅・高さのうち厳しい側へ縮尺を合わせるため、逆数側では大きい比率を使う。
 */
export function getMeetUserUnitsPerPixel(
  viewBox: Dimensions,
  container: Dimensions,
): number | null {
  if (!hasPositiveFiniteDimensions(viewBox) || !hasPositiveFiniteDimensions(container)) {
    return null;
  }

  return Math.max(viewBox.width / container.width, viewBox.height / container.height);
}
