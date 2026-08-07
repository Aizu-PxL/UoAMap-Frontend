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
