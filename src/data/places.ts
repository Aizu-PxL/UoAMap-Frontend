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

function svg(
  id: string,
  floorId: string,
  name: string,
  svgElementId: string,
): Place {
  return { id, floorId, name, mapping: "svg", svgElementId };
}

function unmapped(id: string, floorId: string, name: string): Place {
  return { id, floorId, name, mapping: "unmapped" };
}

// 紐付けは scripts/verify-places.ts(bun run verify:places)でID実在を検証する。
// unmapped地点は単一SVG要素に対応しない(複合施設・全域など)ものだけを残す。
export const places: Place[] = [
  svg("auditorium", "campus", "講堂", "building_Auditrium"),
  svg("lh-large", "lh-1f", "大講義室", "room_1F_LTh"),
  svg("lh-m2", "lh-2f", "講義棟 M2", "room_2F_M2_202"),
  svg("lh-m3", "lh-2f", "講義棟 M3", "room_2F_M3_203"),
  svg("lh-m4", "lh-2f", "講義棟 M4", "room_2F_M4_204"),
  svg("lh-m5", "lh-2f", "講義棟 M5", "room_2F_M5_205"),
  svg("lh-m6", "lh-2f", "講義棟 M6", "room_2F_M6_206"),
  svg("lh-m7", "lh-2f", "講義棟 M7", "room_2F_M7_207"),
  svg("lh-m8", "lh-1f", "講義棟 M8", "room_1F_M8_103"),
  svg("lh-m10", "lh-1f", "講義棟 M10", "room_1F_M10_105"),
  svg("ubic", "campus", "UBIC", "building_UBIC"),
  svg("ubic-3d-theater", "ubic-1f", "UBIC 3Dシアター", "room_3DTh"),
  svg("ubic-lab", "ubic-1f", "UBIC 研究ラボエリア", "area_ResearchLab"),
  svg("ubic-motion", "ubic-1f", "UBIC 運動解析ルーム", "room_Motion"),
  svg("sh-cafeteria", "sh-1f", "学生ホール 食堂", "room_1F_Cafeteria"),
  // 食堂・ホール両方を指す複合地点のため単一SVG要素に対応しない
  unmapped("sh-reception", "sh-1f", "学生ホール 食堂／ホール"),
  svg("sh-hall", "sh-1f", "学生ホール ホール", "room_1F_hall"),
  svg("sh-shop", "sh-1f", "学生ホール 売店", "room_1F_Shop"),
  // 建物単位の地点はキャンパス全体図の building_* に紐付ける
  svg("rq", "campus", "研究棟", "building_ResearchQuad"),
  // キャンパス全体を示す単一SVG要素は存在しない
  unmapped("campus-all", "campus", "キャンパス全域"),
  svg("rq1-104f", "rq-1f", "研究棟1F 104F", "room_n1_104"),
  svg("rq1-141e", "rq-1f", "研究棟1F 141E", "room_s1_141"),
  svg("rq1-144f", "rq-1f", "研究棟1F 144F", "room_s1_144"),
  svg("rq1-127", "rq-1f", "研究棟1F 127", "room_m1_Global_127"),
  svg("rq1-161", "rq-1f", "研究棟1F 161", "room_w1_Geek_161"),
  svg("rq2-201f", "rq-2f", "研究棟2F 201F", "room_n2_201"),
  svg("rq2-243b", "rq-2f", "研究棟2F 243B", "room_s2_243"),
  svg("rq2-267", "rq-2f", "研究棟2F 267", "room_m2_267"),
  svg("rq2-268", "rq-2f", "研究棟2F 268", "room_m2_268"),
  svg("rq2-s1", "rq-2f", "研究棟2F S1", "room_w2_S1_275"),
  svg("rq2-s4", "rq-2f", "研究棟2F S4", "room_w2_S4_275"),
  svg("rq3-325f", "rq-3f", "研究棟3F 325F", "room_m3_325"),
  svg("rq3-328e", "rq-3f", "研究棟3F 328E", "room_m3_328"),
  svg("rq3-342a", "rq-3f", "研究棟3F 342A", "room_s3_342"),
  svg("rq3-348e", "rq-3f", "研究棟3F 348E", "room_s3_348"),
  svg("rq3-m11", "rq-3f", "研究棟3F M11", "room_e3_M11_361"),
  // LICTiA1FのSVGに専用要素が見つからない
  unmapped("lictia-chamber", "lictia-1f", "LICTiA1F 箱庭チャンバー室"),
  svg(
    "lictia-innovation",
    "lictia-1f",
    "LICTiA1F イノベーション創出スペース",
    "area_1F_Innovation",
  ),
  svg("robot-garage", "campus", "駐車場 ロボット格納庫", "building_RobotGarage"),
];

const placeById = new Map(places.map((place) => [place.id, place]));

export function getPlace(placeId: string): Place | undefined {
  return placeById.get(placeId);
}
