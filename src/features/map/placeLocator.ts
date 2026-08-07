import type { Place } from "../../data/types";
import type { OverlayBounds } from "./mapOverlayGeometry";

export type PlaceCoordinates = {
  x: number;
  y: number;
};

// getBBox() は対象要素のローカル座標なので、入れ子の transform も反映してルート座標へ戻す。
function toRootPoint(
  point: PlaceCoordinates,
  matrix: DOMMatrix | null,
  rootMatrix: DOMMatrix | null,
): PlaceCoordinates {
  if (!matrix) {
    return point;
  }

  const viewportX = matrix.a * point.x + matrix.c * point.y + matrix.e;
  const viewportY = matrix.b * point.x + matrix.d * point.y + matrix.f;
  if (!rootMatrix) {
    return { x: viewportX, y: viewportY };
  }

  const determinant = rootMatrix.a * rootMatrix.d - rootMatrix.b * rootMatrix.c;
  if (determinant === 0) {
    return point;
  }

  const translatedX = viewportX - rootMatrix.e;
  const translatedY = viewportY - rootMatrix.f;
  return {
    x: (rootMatrix.d * translatedX - rootMatrix.c * translatedY) / determinant,
    y: (-rootMatrix.b * translatedX + rootMatrix.a * translatedY) / determinant,
  };
}

/** SVG要素の中心を、表示中SVGのルート座標へ解決する。 */
export function getSvgElementCoordinates(
  svgElementId: string,
  svgElement: SVGSVGElement | null,
): PlaceCoordinates | null {
  if (!svgElement) {
    return null;
  }

  const targetElement = svgElement.getElementById(svgElementId);
  if (!(targetElement instanceof SVGGraphicsElement)) {
    return null;
  }

  try {
    const bounds = targetElement.getBBox();
    return toRootPoint(
      { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 },
      targetElement.getCTM(),
      svgElement.getCTM(),
    );
  } catch {
    // 非描画要素など getBBox() を取得できない要素は位置解決不可として扱う。
    return null;
  }
}

/** SVG要素の外形bboxを、表示中SVGのルート座標へ解決する。 */
export function getSvgElementBounds(
  svgElementId: string,
  svgElement: SVGSVGElement | null,
): OverlayBounds | null {
  if (!svgElement) {
    return null;
  }

  const targetElement = svgElement.getElementById(svgElementId);
  if (!(targetElement instanceof SVGGraphicsElement)) {
    return null;
  }

  try {
    const bounds = targetElement.getBBox();
    if (!(bounds.width > 0) || !(bounds.height > 0)) {
      return null;
    }

    const matrix = targetElement.getCTM();
    const rootMatrix = svgElement.getCTM();
    // 回転・傾斜のある transform でも軸平行の外接矩形になるよう4隅すべてを変換する。
    const corners = [
      { x: bounds.x, y: bounds.y },
      { x: bounds.x + bounds.width, y: bounds.y },
      { x: bounds.x, y: bounds.y + bounds.height },
      { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
    ].map((corner) => toRootPoint(corner, matrix, rootMatrix));

    return {
      left: Math.min(...corners.map((corner) => corner.x)),
      top: Math.min(...corners.map((corner) => corner.y)),
      right: Math.max(...corners.map((corner) => corner.x)),
      bottom: Math.max(...corners.map((corner) => corner.y)),
    };
  } catch {
    return null;
  }
}

/** Place の位置指定を、表示中 SVG のルート座標へ解決する。 */
export function getPlaceCoordinates(
  place: Place,
  svgElement: SVGSVGElement | null,
): PlaceCoordinates | null {
  if (place.mapping === "unmapped") {
    return null;
  }

  if (place.mapping === "coordinates") {
    return { ...place.coordinates };
  }

  if (!svgElement) {
    return null;
  }

  return getSvgElementCoordinates(place.svgElementId, svgElement);
}
