export const DEFAULT_FLOOR_ID = "campus";

const floorGroups = [
  ["rq-1f", "rq-2f", "rq-3f"],
  ["sh-1f", "sh-2f"],
  ["lh-1f", "lh-2f"],
] as const;

export function getSelectableFloorIds(floorId: string): readonly string[] | null {
  return (
    floorGroups.find((group) => group.some((candidate) => candidate === floorId)) ?? null
  );
}

export function getFloorLabel(floorId: string): string {
  return floorId.slice(floorId.lastIndexOf("-") + 1).toUpperCase();
}

export function isSameBuilding(floorId1: string, floorId2: string): boolean {
  return floorGroups.some(
    (group) =>
      group.some((candidate) => candidate === floorId1) &&
      group.some((candidate) => candidate === floorId2),
  );
}
