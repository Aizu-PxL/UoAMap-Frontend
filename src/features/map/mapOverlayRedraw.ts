import type { MapViewBox } from "./mapViewBox";

type Dimensions = {
  width: number;
  height: number;
};

export function getMapOverlayRedrawKey(
  viewBox: MapViewBox,
  container: Dimensions,
) {
  return `${viewBox.width}:${viewBox.height}:${container.width}:${container.height}`;
}
