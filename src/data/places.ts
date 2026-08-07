import placeProposalsJson from "../../uoamap-place-proposals.json";
import type { Floor, MapSheet, Place } from "./types";

// 地図シート・フロア・地点のレジストリ。
// QR座標地点はRoute Editor出力JSON、イベント会場は背景SVG要素／専用座標で管理する。
// placeId の語彙はこのファイルから公開するplacesが正。

const publicBaseUrl = import.meta.env.BASE_URL ?? "/";
const publicUrl = (relativePath: string) =>
  `${publicBaseUrl}${relativePath.replace(/^\/+/u, "")}`;

export const mapSheets: MapSheet[] = [
  {
    id: "campus",
    name: "キャンパス全体",
    svgUrl: publicUrl("maps/CampusMap_base_plain.svg"),
  },
  {
    id: "rq1f",
    name: "研究棟 1F",
    svgUrl: publicUrl("maps/RQ1F_base_plain.svg"),
  },
  {
    id: "rq2f",
    name: "研究棟 2F",
    svgUrl: publicUrl("maps/RQ2F_base_plain.svg"),
  },
  {
    id: "rq3f",
    name: "研究棟 3F",
    svgUrl: publicUrl("maps/RQ3F_base_plain.svg"),
  },
  {
    id: "lh1f",
    name: "講義棟 1F",
    svgUrl: publicUrl("maps/LH1F_base_plain.svg"),
  },
  {
    id: "lh2f",
    name: "講義棟 2F",
    svgUrl: publicUrl("maps/LH2F_base_plain.svg"),
  },
  {
    id: "sh1f",
    name: "学生ホール 1F",
    svgUrl: publicUrl("maps/SH1F_base_plain.svg"),
  },
  {
    id: "sh2f",
    name: "学生ホール 2F",
    svgUrl: publicUrl("maps/SH2F_base_plain.svg"),
  },
  {
    id: "ubic",
    name: "UBIC",
    svgUrl: publicUrl("maps/UBIC_base_plain.svg"),
  },
  {
    id: "lictia",
    name: "LICTiA 1F",
    svgUrl: publicUrl("maps/LICTiA1F_base_plain.svg"),
  },
];

export const floors: Floor[] = [
  { id: "campus", sheetId: "campus", name: "屋外" },
  { id: "rq-1f", sheetId: "rq1f", name: "研究棟 1F" },
  { id: "rq-2f", sheetId: "rq2f", name: "研究棟 2F" },
  { id: "rq-3f", sheetId: "rq3f", name: "研究棟 3F" },
  { id: "lh-1f", sheetId: "lh1f", name: "講義棟 1F" },
  { id: "lh-2f", sheetId: "lh2f", name: "講義棟 2F" },
  { id: "sh-1f", sheetId: "sh1f", name: "学生ホール 1F" },
  { id: "sh-2f", sheetId: "sh2f", name: "学生ホール 2F" },
  { id: "ubic-1f", sheetId: "ubic", name: "UBIC" },
  { id: "lictia-1f", sheetId: "lictia", name: "LICTiA 1F" },
];

function svg(id: string, floorId: string, name: string, svgElementId: string): Place {
  return { id, floorId, name, mapping: "svg", svgElementId };
}

function unmapped(id: string, floorId: string, name: string): Place {
  return { id, floorId, name, mapping: "unmapped" };
}

function coordinates(
  id: string,
  floorId: string,
  name: string,
  x: number,
  y: number,
): Place {
  return { id, floorId, name, mapping: "coordinates", coordinates: { x, y } };
}

const qrPlaces: Place[] = placeProposalsJson.map((proposal) =>
  coordinates(
    proposal.id,
    proposal.floorId,
    proposal.name,
    proposal.coordinates.x,
    proposal.coordinates.y,
  ),
);

// Route Editorで既存Routeノードを再利用したQR地点。新規Place案には含まれないため、
// 計画JSONとの整合はscripts/verify-places.tsで明示的に検証する。
const reusedRouteQrPlaces: Place[] = [
  coordinates("main_dormitory", "campus", "創明寮前", 604, 214),
  coordinates("main_lictia_entrance", "campus", "LICTiA入口", 610, 264),
  coordinates("main_gym", "campus", "体育館前", 390, 435),
  coordinates("main_node_32", "campus", "メイン通路管理棟前", 390, 528),
  coordinates("main_node_34", "campus", "メイン通路講堂前", 367, 590),
  coordinates("main_node_36", "campus", "正門", 368, 652),
  coordinates("lh_entrance_west", "lh-1f", "講義棟西口出口", 116, 475),
  coordinates("sh_entrance_south1f", "sh-1f", "学生ホール売店出口", 51, 85),
  coordinates("sh_entrance_east", "sh-2f", "学生ホール東口出口", 125, 3),
  coordinates("ubic_node_2", "ubic-1f", "UBIC出口", 39, 57),
  coordinates("lictia_node_4", "lictia-1f", "LICTiA出口", 112, 52),
  coordinates("main_sh_entrance_south2f", "campus", "学生ホール南口入口", 332, 363),
  coordinates("main_sh_entrance_south1f", "campus", "学生ホール売店入口", 335, 378),
  coordinates("sh_entrance_north", "sh-1f", "学生ホール北口出口", 55, 4),
];

const svgRouteQrPlaces: Place[] = [
  svg("nazonobasyo", "campus", "図書館の池前", "nazonobasyo"),
];

const eventVenuePlaces: Place[] = [
  svg("main_robothangar", "campus", "駐車場 ロボット格納庫", "building_RobotGarage"),
  svg("lh_room_lth_1", "lh-1f", "大講義室", "room_1F_LTh"),
  svg("lh_room_m8", "lh-1f", "講義棟 M8", "room_1F_M8_103"),
  svg("lh_room_m10", "lh-1f", "講義棟 M10", "room_1F_M10_105"),
  svg("lh_room_m2", "lh-2f", "講義棟 M2", "room_2F_M2_202"),
  svg("lh_room_m3", "lh-2f", "講義棟 M3", "room_2F_M3_203"),
  svg("lh_room_m4", "lh-2f", "講義棟 M4", "room_2F_M4_204"),
  svg("lh_room_m5", "lh-2f", "講義棟 M5", "room_2F_M5_205"),
  svg("lh_room_m6", "lh-2f", "講義棟 M6", "room_2F_M6_206"),
  svg("lh_room_m7", "lh-2f", "講義棟 M7", "room_2F_M7_207"),
  coordinates("lictia_room_cswr", "lictia-1f", "LICTiA1F 箱庭チャンバー室", 32.5, 54.6),
  svg(
    "lictia_room_is",
    "lictia-1f",
    "LICTiA1F イノベーション創出スペース",
    "area_1F_Innovation",
  ),
  svg("rq_room_104f", "rq-1f", "研究棟1F 104F", "room_n1_104"),
  svg("rq_room_141E", "rq-1f", "研究棟1F 141E", "room_s1_141"),
  svg("rq_room_144f", "rq-1f", "研究棟1F 144F", "room_s1_144"),
  svg("rq_room_127", "rq-1f", "研究棟1F 127", "room_m1_Global_127"),
  svg("rq_room_161", "rq-1f", "研究棟1F 161", "room_w1_Geek_161"),
  svg("rq_room_201f", "rq-2f", "研究棟2F 201F", "room_n2_201"),
  svg("rq_room_243b", "rq-2f", "研究棟2F 243B", "room_s2_243"),
  svg("rq_room_267", "rq-2f", "研究棟2F 267", "room_m2_267"),
  svg("rq_room_268", "rq-2f", "研究棟2F 268", "room_m2_268"),
  svg("rq_room_s1", "rq-2f", "研究棟2F S1", "room_w2_S1_275"),
  svg("rq_room_s4", "rq-2f", "研究棟2F S4", "room_w2_S4_275"),
  svg("rq_room_325f", "rq-3f", "研究棟3F 325F", "room_m3_325"),
  svg("rq_room_328E", "rq-3f", "研究棟3F 328E", "room_m3_328"),
  svg("rq_room_342a", "rq-3f", "研究棟3F 342A", "room_s3_342"),
  svg("rq_room_348e", "rq-3f", "研究棟3F 348E", "room_s3_348"),
  svg("rq_room_m11", "rq-3f", "研究棟3F M11", "room_e3_M11_361"),
  svg("sh_room_cafeteria", "sh-1f", "学生ホール 食堂", "room_1F_Cafeteria"),
  coordinates("sh_reception", "sh-1f", "学生ホール 食堂／ホール", 66.5, 46.5),
  svg("sh_room_shop", "sh-1f", "学生ホール 売店", "room_1F_Shop"),
  svg("sh_room_kiyare", "sh-1f", "きやれ", "sh_room_kiyare"),
  svg("ubic_room_3dtheater", "ubic-1f", "UBIC 3Dシアター", "room_3DTh"),
  svg("ubic_room_RLA", "ubic-1f", "UBIC 研究ラボエリア", "area_ResearchLab"),
  svg("ubic_room_mar", "ubic-1f", "UBIC 運動解析ルーム", "room_Motion"),
  coordinates("ubic_room_exchange", "ubic-1f", "UBIC 交流スペース", 49, 49),
];

export const places: Place[] = [
  ...qrPlaces,
  ...reusedRouteQrPlaces,
  ...svgRouteQrPlaces,
  ...eventVenuePlaces,
  unmapped("campus-all", "campus", "キャンパス全域"),
];

const placeById = new Map(places.map((place) => [place.id, place]));

export function getPlace(placeId: string): Place | undefined {
  return placeById.get(placeId);
}
