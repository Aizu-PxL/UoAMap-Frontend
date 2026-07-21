const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

const LABEL_TARGET_PX = 12;
const LABEL_LINE_HEIGHT = 1.2;
const LABEL_COLLISION_PADDING_PX = 2;
const LABEL_CHARACTER_WIDTH_EM = 0.95;

const campusBuildingLabelIds = new Set([
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

export interface MapLabel {
  id: string;
  lines: string[];
  lineOffsetsEm: number[];
  anchor: { x: number; y: number };
  originalFontSize: number;
  textAnchor: "start" | "middle" | "end";
  sourceWasHidden: boolean;
  visibilityAncestors: SVGElement[];
}

interface RenderMapLabelsOptions {
  layer: SVGSVGElement;
  labels: MapLabel[];
  userUnitsPerPixel: number;
  isCampusOverview: boolean;
}

interface LabelBoundingBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
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
    // キャンパス俯瞰では建物名が衝突カリングでも勝つよう、font-sizeより優先する
    if (isCampusOverview) {
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

function getLabelBoundingBox(
  label: MapLabel,
  y: number,
  fontSize: number,
  padding: number,
): LabelBoundingBox {
  const longestLineLength = Math.max(
    1,
    ...label.lines.map((line) => Array.from(line).length),
  );
  const width = longestLineLength * fontSize * LABEL_CHARACTER_WIDTH_EM;
  const height = Math.max(1, label.lines.length) * fontSize;
  const left =
    label.textAnchor === "middle"
      ? label.anchor.x - width / 2
      : label.textAnchor === "end"
        ? label.anchor.x - width
        : label.anchor.x;

  return {
    left: left - padding,
    top: y - fontSize - padding,
    right: left + width + padding,
    bottom: y - fontSize + height + padding,
  };
}

function boundingBoxesIntersect(
  first: LabelBoundingBox,
  second: LabelBoundingBox,
): boolean {
  return (
    first.left < second.right &&
    first.right > second.left &&
    first.top < second.bottom &&
    first.bottom > second.top
  );
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

    labels.push({
      id: textElement.id || `map-label-${index}`,
      lines,
      lineOffsetsEm: getLineOffsetsEm(textElement, lineElements, originalFontSize),
      anchor,
      originalFontSize,
      textAnchor: getTextAnchor(firstLineElement),
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
}: RenderMapLabelsOptions): void {
  const visibleLabels = labels.filter(isSourceVisible);
  const labelsByPriority = getPrioritizedLabels(visibleLabels, isCampusOverview);
  const fragment = layer.ownerDocument.createDocumentFragment();
  const fontSize = LABEL_TARGET_PX * userUnitsPerPixel;
  const collisionPadding = LABEL_COLLISION_PADDING_PX * userUnitsPerPixel;
  const renderedLabelBoxes: LabelBoundingBox[] = [];

  for (const label of labelsByPriority) {
    // ラベルはアンカー位置に固定(イベント有無で高さがずれない)。
    // マーカーとの重なりはマーカー側を持ち上げて回避する。
    const y = label.anchor.y;
    const boundingBox = getLabelBoundingBox(
      label,
      y,
      fontSize,
      collisionPadding,
    );
    if (
      renderedLabelBoxes.some((renderedBox) =>
        boundingBoxesIntersect(boundingBox, renderedBox),
      )
    ) {
      continue;
    }

    renderedLabelBoxes.push(boundingBox);
    const textElement = layer.ownerDocument.createElementNS(SVG_NAMESPACE, "text");
    textElement.setAttribute("class", "map-label");
    textElement.setAttribute("x", String(label.anchor.x));
    textElement.setAttribute("y", String(y));
    textElement.setAttribute("font-size", String(fontSize));
    textElement.setAttribute("stroke-width", String(1.75 * userUnitsPerPixel));
    textElement.setAttribute("text-anchor", label.textAnchor);
    textElement.setAttribute("data-source-text-id", label.id);
    textElement.setAttribute("data-original-font-size", String(label.originalFontSize));

    for (const [lineIndex, line] of label.lines.entries()) {
      const tspan = layer.ownerDocument.createElementNS(SVG_NAMESPACE, "tspan");
      tspan.setAttribute("x", String(label.anchor.x));
      if (lineIndex > 0) {
        const previousOffset = label.lineOffsetsEm[lineIndex - 1] ?? 0;
        const currentOffset =
          label.lineOffsetsEm[lineIndex] ?? previousOffset + LABEL_LINE_HEIGHT;
        tspan.setAttribute("dy", `${currentOffset - previousOffset}em`);
      }
      tspan.textContent = line;
      textElement.append(tspan);
    }

    fragment.append(textElement);
  }

  layer.replaceChildren(fragment);
}
