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

// 半角(ラテン・数字・記号)の実測幅は全角のおよそ6割。1文字=全角幅で見積もると
// 「LICTiA」「104F」のような文字列で矩形が倍近く膨らみ、衝突カリングが過剰に効く。
const NARROW_CHARACTER_WIDTH_RATIO = 0.58;
const FULL_WIDTH_CHARACTER_PATTERN =
  /[ᄀ-ᅟ⺀-〾ぁ-㏿㐀-䶿一-鿿ꀀ-꓏가-힣豈-﫿︰-﹏＀-｠￠-￦]/u;

/** 文字種から文字列幅(em)を見積もる。fullWidthEm は全角1文字ぶんの幅。 */
export function getEstimatedTextWidthEm(text: string, fullWidthEm: number): number {
  let widthEm = 0;
  for (const character of text) {
    widthEm += FULL_WIDTH_CHARACTER_PATTERN.test(character)
      ? fullWidthEm
      : fullWidthEm * NARROW_CHARACTER_WIDTH_RATIO;
  }

  return widthEm;
}

export function getCenteredLabelBounds(
  center: OverlayPoint,
  lines: string[],
  centeredLineOffsetsEm: number[],
  fontSize: number,
  characterWidthEm: number,
  padding: number,
): OverlayBounds {
  const widestLineEm = Math.max(
    characterWidthEm,
    ...lines.map((line) => getEstimatedTextWidthEm(line, characterWidthEm)),
  );
  const width = widestLineEm * fontSize;
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
