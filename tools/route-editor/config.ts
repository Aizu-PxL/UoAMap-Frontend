export type RouteEditorMapConfig = {
  sheetId: string;
  file: string;
  floor: string;
  group: string;
  name: string;
};

export const routeEditorMaps = [
  {
    sheetId: "campus",
    file: "CampusMap_base_plain.svg",
    floor: "campus",
    group: "campus",
    name: "キャンパス全体",
  },
  {
    sheetId: "rq1f",
    file: "RQ1F_base_plain.svg",
    floor: "rq-1f",
    group: "rq",
    name: "研究棟 1F",
  },
  {
    sheetId: "rq2f",
    file: "RQ2F_base_plain.svg",
    floor: "rq-2f",
    group: "rq",
    name: "研究棟 2F",
  },
  {
    sheetId: "rq3f",
    file: "RQ3F_base_plain.svg",
    floor: "rq-3f",
    group: "rq",
    name: "研究棟 3F",
  },
  {
    sheetId: "lh1f",
    file: "LH1F_base_plain.svg",
    floor: "lh-1f",
    group: "lh",
    name: "講義棟 1F",
  },
  {
    sheetId: "lh2f",
    file: "LH2F_base_plain.svg",
    floor: "lh-2f",
    group: "lh",
    name: "講義棟 2F",
  },
  {
    sheetId: "sh1f",
    file: "SH1F_base_plain.svg",
    floor: "sh-1f",
    group: "sh",
    name: "学生ホール 1F",
  },
  {
    sheetId: "sh2f",
    file: "SH2F_base_plain.svg",
    floor: "sh-2f",
    group: "sh",
    name: "学生ホール 2F",
  },
  {
    sheetId: "ubic",
    file: "UBIC_base_plain.svg",
    floor: "ubic-1f",
    group: "ubic",
    name: "UBIC",
  },
  {
    sheetId: "lictia",
    file: "LICTiA1F_base_plain.svg",
    floor: "lictia-1f",
    group: "lictia",
    name: "LICTiA 1F",
  },
] as const satisfies readonly RouteEditorMapConfig[];

export const routeEditorFloorOrder = routeEditorMaps.map(
  (config) => config.floor,
);

// 一覧を狭く保つ既存表示を維持しつつ、canonicalなFloor名との関係を固定する。
export function toRouteEditorFloorName(floorName: string): string {
  return floorName.replace(/\s+(?=\d+F$)/, "");
}

export const routeEditorFloorNames: Readonly<Record<string, string>> = {
  campus: "屋外",
  "rq-1f": "研究棟1F",
  "rq-2f": "研究棟2F",
  "rq-3f": "研究棟3F",
  "lh-1f": "講義棟1F",
  "lh-2f": "講義棟2F",
  "sh-1f": "学生ホール1F",
  "sh-2f": "学生ホール2F",
  "ubic-1f": "UBIC",
  "lictia-1f": "LICTiA1F",
};

export const routeEditorRuntimeConfig = {
  MAPS: routeEditorMaps,
  FLOOR_ORDER: routeEditorFloorOrder,
  FLOOR_NAME: routeEditorFloorNames,
};

export type RouteEditorRuntimeConfig = typeof routeEditorRuntimeConfig;
