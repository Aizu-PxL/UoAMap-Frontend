import type { Floor, MapSheet, Place } from "./types";

// 地図シート・フロア・地点のレジストリ。
// 将来はSVGから自動生成する(SPEC.md 4章)。それまでは手書きで管理し、
// placeId の語彙はこのファイルが正(バックエンドに登録するplaceIdもここから選ぶ)。

export const mapSheets: MapSheet[] = [
  { id: "campus", name: "キャンパス全体", svgUrl: "/maps/CampusMap_base_plain.svg" },
  { id: "rq1f", name: "研究棟 1F", svgUrl: "/maps/RQ1F_base_plain.svg" },
  { id: "rq2f", name: "研究棟 2F", svgUrl: "/maps/RQ2F_base_plain.svg" },
  { id: "rq3f", name: "研究棟 3F", svgUrl: "/maps/RQ3F_base_plain.svg" },
  { id: "lh", name: "講義棟", svgUrl: "/maps/LH_base_plain.svg" },
  { id: "sh1f", name: "学生ホール 1F", svgUrl: "/maps/SH1F_base_plain.svg" },
  { id: "sh2f", name: "学生ホール 2F", svgUrl: "/maps/SH2F_base_plain.svg" },
  { id: "ubic", name: "UBIC", svgUrl: "/maps/UBIC_base_plain.svg" },
  { id: "lictia", name: "LICTiA 1F", svgUrl: "/maps/LICTiA1F_base_plain.svg" },
];

export const floors: Floor[] = [
  { id: "campus", sheetId: "campus", name: "屋外" },
  { id: "rq-1f", sheetId: "rq1f", name: "研究棟 1F" },
  { id: "rq-2f", sheetId: "rq2f", name: "研究棟 2F" },
  { id: "rq-3f", sheetId: "rq3f", name: "研究棟 3F" },
  // 講義棟は1シートに1F/2Fが併記されている(SPEC.md 3.1)
  { id: "lh-1f", sheetId: "lh", name: "講義棟 1F" },
  { id: "lh-2f", sheetId: "lh", name: "講義棟 2F" },
  { id: "sh-1f", sheetId: "sh1f", name: "学生ホール 1F" },
  { id: "sh-2f", sheetId: "sh2f", name: "学生ホール 2F" },
  { id: "ubic-1f", sheetId: "ubic", name: "UBIC" },
  { id: "lictia-1f", sheetId: "lictia", name: "LICTiA 1F" },
];

function unmapped(id: string, floorId: string, name: string): Place {
  return { id, floorId, name, mapping: "unmapped" };
}

// 未紐付け地点はmappingで明示し、SVG要素IDまたは座標の確定はステップ2で行う。
export const places: Place[] = [
  {
    id: "auditorium",
    floorId: "campus",
    name: "講堂",
    mapping: "svg",
    svgElementId: "building_Auditrium",
  },
  unmapped("lh-large", "lh-1f", "大講義室"),
  unmapped("lh-m2", "lh-2f", "講義棟 M2"),
  unmapped("lh-m3", "lh-2f", "講義棟 M3"),
  unmapped("lh-m4", "lh-2f", "講義棟 M4"),
  unmapped("lh-m5", "lh-2f", "講義棟 M5"),
  unmapped("lh-m6", "lh-2f", "講義棟 M6"),
  {
    id: "lh-m7",
    floorId: "lh-2f",
    name: "講義棟 M7",
    mapping: "svg",
    svgElementId: "room_2F_M7_207",
  },
  {
    id: "lh-m8",
    floorId: "lh-1f",
    name: "講義棟 M8",
    mapping: "svg",
    svgElementId: "room_1F_M8_103",
  },
  unmapped("lh-m10", "lh-1f", "講義棟 M10"),
  unmapped("ubic", "ubic-1f", "UBIC"),
  unmapped("ubic-3d-theater", "ubic-1f", "UBIC 3Dシアター"),
  unmapped("ubic-lab", "ubic-1f", "UBIC 研究ラボエリア"),
  unmapped("ubic-motion", "ubic-1f", "UBIC 運動解析ルーム"),
  unmapped("sh-cafeteria", "sh-1f", "学生ホール 食堂"),
  unmapped("sh-reception", "sh-1f", "学生ホール 食堂／ホール"),
  unmapped("sh-hall", "sh-1f", "学生ホール ホール"),
  unmapped("sh-shop", "sh-1f", "学生ホール 売店"),
  unmapped("rq", "rq-1f", "研究棟"),
  unmapped("campus-all", "campus", "キャンパス全域"),
  unmapped("rq1-104f", "rq-1f", "研究棟1F 104F"),
  unmapped("rq1-141e", "rq-1f", "研究棟1F 141E"),
  unmapped("rq1-144f", "rq-1f", "研究棟1F 144F"),
  unmapped("rq1-127", "rq-1f", "研究棟1F 127"),
  unmapped("rq1-161", "rq-1f", "研究棟1F 161"),
  unmapped("rq2-201f", "rq-2f", "研究棟2F 201F"),
  unmapped("rq2-243b", "rq-2f", "研究棟2F 243B"),
  unmapped("rq2-267", "rq-2f", "研究棟2F 267"),
  unmapped("rq2-268", "rq-2f", "研究棟2F 268"),
  unmapped("rq2-s1", "rq-2f", "研究棟2F S1"),
  unmapped("rq2-s4", "rq-2f", "研究棟2F S4"),
  unmapped("rq3-325f", "rq-3f", "研究棟3F 325F"),
  unmapped("rq3-328e", "rq-3f", "研究棟3F 328E"),
  unmapped("rq3-342a", "rq-3f", "研究棟3F 342A"),
  unmapped("rq3-348e", "rq-3f", "研究棟3F 348E"),
  unmapped("rq3-m11", "rq-3f", "研究棟3F M11"),
  unmapped("lictia-chamber", "lictia-1f", "LICTiA1F 箱庭チャンバー室"),
  unmapped(
    "lictia-innovation",
    "lictia-1f",
    "LICTiA1F イノベーション創出スペース",
  ),
  unmapped("robot-garage", "campus", "駐車場 ロボット格納庫"),
];

const placeById = new Map(places.map((place) => [place.id, place]));

export function getPlace(placeId: string): Place | undefined {
  return placeById.get(placeId);
}
