import type { Place } from "../../data/types";

export type PlaceCoordinates = {
  x: number;
  y: number;
};

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

  const placeElement = svgElement.getElementById(place.svgElementId);
  if (!(placeElement instanceof SVGGraphicsElement)) {
    return null;
  }

  try {
    const bounds = placeElement.getBBox();
    const center = {
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2,
    };
    const matrix = placeElement.getCTM();
    const rootMatrix = svgElement.getCTM();

    // getBBox() は対象要素のローカル座標なので、入れ子の transform も反映する。
    if (matrix && rootMatrix) {
      const viewportX = matrix.a * center.x + matrix.c * center.y + matrix.e;
      const viewportY = matrix.b * center.x + matrix.d * center.y + matrix.f;
      const determinant = rootMatrix.a * rootMatrix.d - rootMatrix.b * rootMatrix.c;

      if (determinant !== 0) {
        const translatedX = viewportX - rootMatrix.e;
        const translatedY = viewportY - rootMatrix.f;
        return {
          x: (rootMatrix.d * translatedX - rootMatrix.c * translatedY) / determinant,
          y: (-rootMatrix.b * translatedX + rootMatrix.a * translatedY) / determinant,
        };
      }
    } else if (matrix) {
      return {
        x: matrix.a * center.x + matrix.c * center.y + matrix.e,
        y: matrix.b * center.x + matrix.d * center.y + matrix.f,
      };
    }

    return center;
  } catch {
    // 非描画要素など getBBox() を取得できない地点はフォーカス不可として扱う。
    return null;
  }
}
