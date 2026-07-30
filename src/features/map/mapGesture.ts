export function exceedsMapTapMovement(
  start: { x: number; y: number },
  current: { x: number; y: number },
  threshold = 8,
): boolean {
  return Math.hypot(current.x - start.x, current.y - start.y) > threshold;
}
