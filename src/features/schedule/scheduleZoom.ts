export const SCHEDULE_MIN_SCALE = 0.75;
export const SCHEDULE_MAX_SCALE = 3;
export const SCHEDULE_SCALE_STEP = 0.25;

export function clampScheduleScale(scale: number): number {
  if (!Number.isFinite(scale)) {
    return 1;
  }

  return Math.min(SCHEDULE_MAX_SCALE, Math.max(SCHEDULE_MIN_SCALE, scale));
}

export function getNextScheduleScale(scale: number, direction: "in" | "out"): number {
  const nextScale = clampScheduleScale(scale) + (direction === "in" ? SCHEDULE_SCALE_STEP : -SCHEDULE_SCALE_STEP);
  return clampScheduleScale(Number(nextScale.toFixed(2)));
}

export function getPinchScheduleScale(
  initialScale: number,
  initialDistance: number,
  currentDistance: number,
): number {
  if (!Number.isFinite(initialDistance) || initialDistance <= 0 || !Number.isFinite(currentDistance)) {
    return clampScheduleScale(initialScale);
  }

  return clampScheduleScale(initialScale * (currentDistance / initialDistance));
}

/**
 * 焦点(ピンチ中心・表示中央)が指している画像上の等倍座標を求める。
 * `transform-origin: top left` なので、画像原点のクライアント座標は倍率に依存しない。
 */
export function getScheduleZoomAnchor(
  focalClient: number,
  imageOriginClient: number,
  scale: number,
): number {
  if (!Number.isFinite(scale) || scale <= 0 || !Number.isFinite(focalClient) || !Number.isFinite(imageOriginClient)) {
    return 0;
  }

  return (focalClient - imageOriginClient) / scale;
}

/**
 * 等倍座標 `anchor` を `focalClient` の位置へ合わせるためのスクロール位置。
 * `scrollOrigin` はジェスチャ開始時の「画像原点のクライアント座標 + スクロール位置」で、
 * transform はレイアウトを変えないためジェスチャ中は一定になる。
 */
export function getScheduleFocalScroll(
  scrollOrigin: number,
  anchor: number,
  nextScale: number,
  focalClient: number,
): number {
  const nextScroll = scrollOrigin + anchor * nextScale - focalClient;
  return Number.isFinite(nextScroll) ? nextScroll : 0;
}
