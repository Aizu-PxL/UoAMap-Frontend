import {
  getCenteredLabelBounds,
  getCenteredLineOffsetsEm,
  isOverlayBoundsExcluded,
  overlayBoundsIntersect,
} from "./mapOverlayGeometry";
import type { OverlayBounds, OverlayPoint } from "./mapOverlayGeometry";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

export const LABEL_TARGET_PX = 12;
export const LABEL_LINE_HEIGHT = 1.2;
const LABEL_COLLISION_PADDING_PX = 2;
const LABEL_CHARACTER_WIDTH_EM = 0.95;

export const campusBuildingLabelIds = new Set([
  "text_RobotGarage",
  "text_SomeiHouse",
  "text_ClubHouse",
  "text_FieldHouse",
  "text_LICTiA",
  "text_UBIC",
  "text_ResearchQuad",
  "text_Gymnasium",
  "text_AdminComplex",
  "text_LecHall",
  "text_Kiyare",
  "text_Shop",
  "text_Cafeteria",
  "text_StudentHall",
  "text_Library",
  "text_Auditrium",
]);

// イベント集約バッジのアンカー先となる5建物の建物名。俯瞰の衝突カリングで最優先にする
export const campusAggregateBuildingLabelIds = new Set([
  "text_ResearchQuad",
  "text_StudentHall",
  "text_LecHall",
  "text_UBIC",
  "text_LICTiA",
]);

export interface MapLabel {
  id: string;
  lines: string[];
  lineOffsetsEm: number[];
  center: OverlayPoint;
  originalFontSize: number;
  sourceWasHidden: boolean;
  visibilityAncestors: SVGElement[];
}

interface RenderMapLabelsOptions {
  layer: SVGSVGElement;
  labels: MapLabel[];
  userUnitsPerPixel: number;
  isCampusOverview: boolean;
  exclusionBounds?: OverlayBounds[];
}

function parseNumericValue(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getPresentationValue(element: SVGElement, property: string): string | null {
  let current: Element | null = element;

  while (current instanceof SVGElement) {
    const styleValue = current.style.getPropertyValue(property).trim();
    if (styleValue) {
      return styleValue;
    }

    const attributeValue = current.getAttribute(property)?.trim();
    if (attributeValue) {
      return attributeValue;
    }

    current = current.parentElement;
  }

  return null;
}

function getOriginalFontSize(
  textElement: SVGTextElement,
  lineElements: SVGElement[],
): number | null {
  const textFontSize = parseNumericValue(getPresentationValue(textElement, "font-size"));
  if (textFontSize !== null) {
    return textFontSize;
  }

  const lineFontSizes = lineElements
    .map((lineElement) =>
      parseNumericValue(getPresentationValue(lineElement, "font-size")),
    )
    .filter((fontSize): fontSize is number => fontSize !== null);

  return lineFontSizes.length > 0 ? Math.max(...lineFontSizes) : null;
}

function getTransformToRoot(element: SVGGraphicsElement, root: SVGSVGElement): DOMMatrix {
  let matrix = new DOMMatrix();
  let current: Element | null = element;

  while (current && current !== root) {
    if (current instanceof SVGGraphicsElement) {
      const consolidatedTransform = current.transform.baseVal.consolidate();
      if (consolidatedTransform) {
        const { a, b, c, d, e, f } = consolidatedTransform.matrix;
        matrix = new DOMMatrix([a, b, c, d, e, f]).multiply(matrix);
      }
    }
    current = current.parentElement;
  }

  return matrix;
}

function getAnchor(
  textElement: SVGTextElement,
  firstLineElement: SVGGraphicsElement,
  root: SVGSVGElement,
): { x: number; y: number } | null {
  const x =
    parseNumericValue(firstLineElement.getAttribute("x")) ??
    parseNumericValue(textElement.getAttribute("x"));
  const y =
    parseNumericValue(firstLineElement.getAttribute("y")) ??
    parseNumericValue(textElement.getAttribute("y"));

  if (x === null || y === null) {
    return null;
  }

  const transformedPoint = new DOMPoint(x, y).matrixTransform(
    getTransformToRoot(firstLineElement, root),
  );
  if (!Number.isFinite(transformedPoint.x) || !Number.isFinite(transformedPoint.y)) {
    return null;
  }

  return { x: transformedPoint.x, y: transformedPoint.y };
}

function getTextAnchor(element: SVGElement): "start" | "middle" | "end" {
  const textAnchor = getPresentationValue(element, "text-anchor");
  return textAnchor === "middle" || textAnchor === "end" ? textAnchor : "start";
}

function getSourceVisualCenter(
  textElement: SVGTextElement,
  root: SVGSVGElement,
): OverlayPoint | null {
  try {
    const bounds = textElement.getBBox();
    if (
      !Number.isFinite(bounds.x) ||
      !Number.isFinite(bounds.y) ||
      !Number.isFinite(bounds.width) ||
      !Number.isFinite(bounds.height) ||
      bounds.width <= 0 ||
      bounds.height <= 0
    ) {
      return null;
    }

    const transformedCenter = new DOMPoint(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
    ).matrixTransform(getTransformToRoot(textElement, root));

    return Number.isFinite(transformedCenter.x) && Number.isFinite(transformedCenter.y)
      ? { x: transformedCenter.x, y: transformedCenter.y }
      : null;
  } catch {
    return null;
  }
}

function estimateVisualCenter(
  anchor: OverlayPoint,
  lines: string[],
  lineOffsetsEm: number[],
  originalFontSize: number,
  textAnchor: "start" | "middle" | "end",
): OverlayPoint {
  const longestLineLength = Math.max(
    1,
    ...lines.map((line) => Array.from(line).length),
  );
  const estimatedWidth =
    longestLineLength * originalFontSize * LABEL_CHARACTER_WIDTH_EM;
  const firstOffset = lineOffsetsEm[0] ?? 0;
  const lastOffset = lineOffsetsEm[lineOffsetsEm.length - 1] ?? firstOffset;

  return {
    x:
      textAnchor === "middle"
        ? anchor.x
        : textAnchor === "end"
          ? anchor.x - estimatedWidth / 2
          : anchor.x + estimatedWidth / 2,
    y: anchor.y + ((firstOffset + lastOffset) / 2 - 0.5) * originalFontSize,
  };
}

function getLineOffsetsEm(
  textElement: SVGTextElement,
  lineElements: SVGGraphicsElement[],
  originalFontSize: number,
): number[] {
  const fallbackY = parseNumericValue(textElement.getAttribute("y"));
  const firstY =
    parseNumericValue(lineElements[0]?.getAttribute("y") ?? null) ?? fallbackY;
  let previousOffset = 0;

  return lineElements.map((lineElement, index) => {
    if (index === 0) {
      return 0;
    }

    const lineY = parseNumericValue(lineElement.getAttribute("y")) ?? fallbackY;
    const sourceOffset =
      firstY !== null && lineY !== null ? (lineY - firstY) / originalFontSize : null;
    const offset =
      sourceOffset !== null && Number.isFinite(sourceOffset) && sourceOffset > previousOffset
        ? sourceOffset
        : previousOffset + LABEL_LINE_HEIGHT;
    previousOffset = offset;
    return offset;
  });
}

function isExplicitlyHidden(element: SVGElement): boolean {
  const display = element.style.display || element.getAttribute("display");
  const visibility = element.style.visibility || element.getAttribute("visibility");
  return display === "none" || visibility === "hidden" || visibility === "collapse";
}

function isSourceVisible(label: MapLabel): boolean {
  return (
    !label.sourceWasHidden &&
    label.visibilityAncestors.every((ancestor) => !isExplicitlyHidden(ancestor))
  );
}

function getPrioritizedLabels(
  labels: MapLabel[],
  isCampusOverview: boolean,
): MapLabel[] {
  // 件数間引きは行わず、衝突カリングの優先順位だけを決める。
  // 重ならない限り全ラベルを描画し、引き時も一覧性を保つ。
  return [...labels].sort((first, second) => {
    // キャンパス俯瞰では建物名が衝突カリングでも勝つよう、font-sizeより優先する。
    // 集約バッジのアンカー先となる5建物名は施設名(食堂・売店等)よりさらに優先する
    if (isCampusOverview) {
      const aggregateDifference =
        Number(campusAggregateBuildingLabelIds.has(second.id)) -
        Number(campusAggregateBuildingLabelIds.has(first.id));
      if (aggregateDifference !== 0) {
        return aggregateDifference;
      }
      const buildingDifference =
        Number(campusBuildingLabelIds.has(second.id)) -
        Number(campusBuildingLabelIds.has(first.id));
      if (buildingDifference !== 0) {
        return buildingDifference;
      }
    }

    return second.originalFontSize - first.originalFontSize;
  });
}

export function extractMapLabels(svgElement: SVGSVGElement): MapLabel[] {
  const labels: MapLabel[] = [];

  for (const [index, textElement] of Array.from(
    svgElement.querySelectorAll<SVGTextElement>("text"),
  ).entries()) {
    const nonEmptyTspans = Array.from(textElement.children)
      .filter((child): child is SVGTSpanElement => child.localName === "tspan")
      .filter((tspan) => Boolean(tspan.textContent?.trim()));
    const lineElements: SVGGraphicsElement[] =
      nonEmptyTspans.length > 0 ? nonEmptyTspans : [textElement];
    const lines = lineElements
      .map((lineElement) => lineElement.textContent?.trim() ?? "")
      .filter(Boolean);
    const firstLineElement = lineElements[0];
    const anchor = firstLineElement
      ? getAnchor(textElement, firstLineElement, svgElement)
      : null;
    const originalFontSize = getOriginalFontSize(textElement, lineElements);
    const sourceWasHidden = isExplicitlyHidden(textElement);
    const sourceVisualCenter = getSourceVisualCenter(textElement, svgElement);
    const visibilityAncestors: SVGElement[] = [];
    let ancestor: Element | null = textElement.parentNode as Element | null;

    while (ancestor && ancestor !== svgElement) {
      if (ancestor instanceof SVGElement) {
        visibilityAncestors.push(ancestor);
      }
      ancestor = ancestor.parentNode as Element | null;
    }

    // The source stays in the loaded SVG for IDs and geometry, but never paints.
    textElement.style.display = "none";
    textElement.setAttribute("aria-hidden", "true");
    textElement.setAttribute("data-map-label-source", "true");

    if (!anchor || originalFontSize === null || lines.length === 0) {
      continue;
    }

    const lineOffsetsEm = getLineOffsetsEm(textElement, lineElements, originalFontSize);
    const textAnchor = getTextAnchor(firstLineElement);
    const center =
      sourceVisualCenter ??
      estimateVisualCenter(anchor, lines, lineOffsetsEm, originalFontSize, textAnchor);

    labels.push({
      id: textElement.id || `map-label-${index}`,
      lines,
      lineOffsetsEm,
      center,
      originalFontSize,
      sourceWasHidden,
      visibilityAncestors,
    });
  }

  return labels;
}

export function renderMapLabels({
  layer,
  labels,
  userUnitsPerPixel,
  isCampusOverview,
  exclusionBounds = [],
}: RenderMapLabelsOptions): void {
  const visibleLabels = labels.filter(isSourceVisible);
  const labelsByPriority = getPrioritizedLabels(visibleLabels, isCampusOverview);
  const fragment = layer.ownerDocument.createDocumentFragment();
  const fontSize = LABEL_TARGET_PX * userUnitsPerPixel;
  const collisionPadding = LABEL_COLLISION_PADDING_PX * userUnitsPerPixel;
  const renderedLabelBoxes: OverlayBounds[] = [];

  for (const label of labelsByPriority) {
    const centeredLineOffsetsEm = getCenteredLineOffsetsEm(
      label.lineOffsetsEm,
      label.lines.length,
      LABEL_LINE_HEIGHT,
    );
    const boundingBox = getCenteredLabelBounds(
      label.center,
      label.lines,
      centeredLineOffsetsEm,
      fontSize,
      LABEL_CHARACTER_WIDTH_EM,
      collisionPadding,
    );
    if (
      isOverlayBoundsExcluded(boundingBox, exclusionBounds) ||
      renderedLabelBoxes.some((renderedBox) =>
        overlayBoundsIntersect(boundingBox, renderedBox),
      )
    ) {
      continue;
    }

    renderedLabelBoxes.push(boundingBox);
    const textElement = layer.ownerDocument.createElementNS(SVG_NAMESPACE, "text");
    textElement.setAttribute("class", "map-label");
    textElement.setAttribute("font-size", String(fontSize));
    textElement.setAttribute("stroke-width", String(1.75 * userUnitsPerPixel));
    textElement.setAttribute("text-anchor", "middle");
    textElement.setAttribute("dominant-baseline", "central");
    textElement.setAttribute("data-source-text-id", label.id);
    textElement.setAttribute("data-original-font-size", String(label.originalFontSize));
    textElement.setAttribute("data-center-x", String(label.center.x));
    textElement.setAttribute("data-center-y", String(label.center.y));

    for (const [lineIndex, line] of label.lines.entries()) {
      const tspan = layer.ownerDocument.createElementNS(SVG_NAMESPACE, "tspan");
      const lineOffsetEm = centeredLineOffsetsEm[lineIndex] ?? 0;
      tspan.setAttribute("x", String(label.center.x));
      tspan.setAttribute("y", String(label.center.y + lineOffsetEm * fontSize));
      tspan.textContent = line;
      textElement.append(tspan);
    }

    fragment.append(textElement);
  }

  layer.replaceChildren(fragment);
}
