import type { Event as CampusEvent, TimeSlot } from "../types";

// 会津大学オープンキャンパス2026 夏ステージ（2026-08-08）の公式Webを優先し、
// Webにない総合案内・自由見学・休憩等は公式タイムスケジュールPDFで補完する。
const DAY = "2026-08-08";

function slot(start: string, end: string): TimeSlot {
  return { start: `${DAY}T${start}:00+09:00`, end: `${DAY}T${end}:00+09:00` };
}

function event(
  id: string,
  title: string,
  description: string,
  placeId: string,
  tags: string[],
  timeSlots: TimeSlot[],
): CampusEvent {
  return { id, title, description, placeId, tags, timeSlots };
}

type OpenLabDefinition = {
  id: string;
  title: string;
  placeId: string;
  timeSlots: TimeSlot[];
};

const openLabs: OpenLabDefinition[] = [
  {
    id: "P1",
    title: "半導体集積回路の設計自動化技術（小平 行秀）",
    placeId: "rq_room_104f",
    timeSlots: [slot("10:00", "12:00"), slot("13:00", "15:00")],
  },
  {
    id: "P2",
    title: "オンラインジャッジシステムと知的ソフトウェア工学（渡部 有隆）",
    placeId: "rq_room_141E",
    timeSlots: [slot("10:00", "12:00"), slot("13:00", "15:00")],
  },
  {
    id: "P3",
    title: "知識体験デザイン：人とAIが共創するシステムを創る（吉岡 廉太郎）",
    placeId: "rq_room_144f",
    timeSlots: [slot("10:30", "14:30")],
  },
  {
    id: "P4",
    title: "地域から世界へ、世界から地域へ：会津大学の国際交流（川口 立喜）",
    placeId: "rq_room_127",
    timeSlots: [slot("09:00", "15:00")],
  },
  {
    id: "P5",
    title: "ものづくり体験、イノベーション創業教育プログラムの紹介（齋藤 広幸）",
    placeId: "rq_room_161",
    timeSlots: [slot("09:30", "12:00"), slot("13:00", "15:00")],
  },
  {
    id: "P6",
    title: "AIで走行するラジコンカー（奥山 祐市）",
    placeId: "rq_room_201f",
    timeSlots: [slot("09:00", "15:00")],
  },
  {
    id: "P7",
    title: "デジタルアート＆クラフト＆ゲーム（池本 淳一）",
    placeId: "rq_room_243b",
    timeSlots: [slot("10:00", "12:00"), slot("13:00", "15:00")],
  },
  {
    id: "P8",
    title: "Reading Research Using Eye Tracking（リングル ウイリアム）",
    placeId: "rq_room_267",
    timeSlots: [slot("10:00", "12:30")],
  },
  {
    id: "P9",
    title: "音声学研究（ウイルソン イアン）",
    placeId: "rq_room_268",
    timeSlots: [slot("12:30", "15:00")],
  },
  {
    id: "P10",
    title: "低消費電力センシングシステムの研究（ダン ナム カイン）",
    placeId: "rq_room_s1",
    timeSlots: [slot("10:00", "12:00"), slot("13:00", "15:00")],
  },
  {
    id: "P11",
    title: "AIだってウソをつく ～壊れない＆だまされないを目指して～（富岡 洋一）",
    placeId: "rq_room_s4",
    timeSlots: [slot("09:00", "12:00"), slot("13:00", "15:00")],
  },
  {
    id: "P12",
    title: "日常健康管理のための生体情報のシームレスモニタリングと総括的な解析（陳 文西）",
    placeId: "rq_room_325f",
    timeSlots: [slot("10:00", "12:00"), slot("13:00", "14:00")],
  },
  {
    id: "P13",
    title: "XR Lab（ナッサーニ アラディン）",
    placeId: "rq_room_328E",
    timeSlots: [slot("13:00", "15:00")],
  },
  {
    id: "P14",
    title: "サイバーセキュリティ：進化する脅威と防御（中村 章人）",
    placeId: "rq_room_342a",
    timeSlots: [slot("12:00", "15:00")],
  },
  {
    id: "P15",
    title: "人間の「目」や「耳」を使って計算する暗号（渡辺 曜大）",
    placeId: "rq_room_348e",
    timeSlots: [slot("10:00", "12:00"), slot("13:00", "15:00")],
  },
  {
    id: "P16",
    title: "AIを用いたパターン認識 Advanced Pattern Recognition using AI（シン ジュンピル）",
    placeId: "rq_room_m11",
    timeSlots: [slot("10:00", "12:00"), slot("13:00", "15:00")],
  },
  {
    id: "P17",
    title: "エッジAIデバイスの研究と地域課題への応用（齋藤 寛・仙波 翔吾）",
    placeId: "lh_room_m10",
    timeSlots: [slot("10:00", "14:00")],
  },
  {
    id: "P18",
    title: "社会美容科学 ～ネイルデザインの美的選好介入アプリ～（畠 圭佑）",
    placeId: "ubic_room_RLA",
    timeSlots: [slot("09:00", "15:00")],
  },
  {
    id: "P19",
    title: "身体の「見えないコツ」を可視化する（中澤 謙）",
    placeId: "ubic_room_mar",
    timeSlots: [slot("10:00", "15:00")],
  },
  {
    id: "P20",
    title: "地上に月面環境を作る！（月火星箱庭プログラム）（出村 裕英）",
    placeId: "lictia_room_cswr",
    timeSlots: [slot("09:00", "12:00")],
  },
  {
    id: "P21",
    title: "宇宙を拓く！（ARC-Spaceの深宇宙探査）（金丸 仁明）",
    placeId: "lictia_room_is",
    timeSlots: [slot("09:00", "12:00")],
  },
  {
    id: "P22",
    title: "災害対応ロボット（成瀬 継太郎）",
    placeId: "main_robothangar",
    timeSlots: [slot("10:00", "15:00")],
  },
];

const openLabEvents = openLabs.map(({ id, title, placeId, timeSlots }) =>
  event(
    id,
    title,
    "研究室の展示やデモを通して、会津大学の研究を体験できます。",
    placeId,
    ["openlab"],
    timeSlots,
  ),
);

const consultationStarts = [
  ["R1", "09:40", "10:00"],
  ["R2", "10:10", "10:30"],
  ["R3", "10:40", "11:00"],
  ["R4", "11:10", "11:30"],
  ["R5", "11:40", "12:00"],
  ["R6", "13:10", "13:30"],
  ["R7", "13:40", "14:00"],
  ["R8", "14:10", "14:30"],
  ["R9", "14:40", "15:00"],
] as const;

const consultationEvents = consultationStarts.map(([id, start, end], index) =>
  event(
    id,
    `受験勉強相談（${index + 1}回目）`,
    "在学生に受験勉強や大学生活について相談できます。",
    "sh_room_cafeteria",
    ["consult"],
    [slot(start, end)],
  ),
);

export const mockEvents: CampusEvent[] = [
  event(
    "C",
    "総合案内・受付",
    "オープンキャンパスの受付と総合案内です。",
    "sh_reception",
    ["info"],
    [slot("09:00", "15:00")],
  ),
  event(
    "A1",
    "大学説明会（1回目）",
    "会津大学の特色や学びについて紹介します。",
    "main_auditorium",
    ["briefing"],
    [slot("09:30", "10:00")],
  ),
  event(
    "A2",
    "大学説明会（2回目）",
    "会津大学の特色や学びについて紹介します。",
    "main_auditorium",
    ["briefing"],
    [slot("13:00", "13:30")],
  ),
  event(
    "L1",
    "入試説明会（1回目）",
    "入試科目・配点、前年度結果、出願のポイントを説明します。",
    "lh_room_lth_1",
    ["briefing"],
    [slot("10:20", "10:50")],
  ),
  event(
    "L2",
    "入試説明会（2回目）",
    "入試科目・配点、前年度結果、出願のポイントを説明します。",
    "lh_room_lth_1",
    ["briefing"],
    [slot("12:00", "12:30")],
  ),
  event(
    "E1",
    "早期（飛び）入試説明会",
    "高校2年生から受験できる早期入試の概要と魅力を紹介します。",
    "lh_room_lth_1",
    ["briefing"],
    [slot("13:00", "13:30")],
  ),
  event(
    "U1",
    "保護者向け説明会（1回目）",
    "学費、生活、就職、入試など保護者向けの情報を説明します。",
    "lh_room_m8",
    ["briefing"],
    [slot("09:30", "10:00")],
  ),
  event(
    "U2",
    "保護者向け説明会（2回目）",
    "学費、生活、就職、入試など保護者向けの情報を説明します。",
    "lh_room_m8",
    ["briefing"],
    [slot("11:10", "11:40")],
  ),
  event(
    "campus-free-tour",
    "キャンパス自由見学",
    "キャンパス内を自由に見学できます。",
    "campus-all",
    ["tour"],
    [slot("09:00", "15:00")],
  ),
  ...openLabEvents,
  event(
    "T1",
    "キャンパスツアー（1回目）",
    "在学生の案内でキャンパスの施設を見学します。",
    "main_ubic_entrance",
    ["tour"],
    [slot("09:30", "10:00")],
  ),
  event(
    "T2",
    "キャンパスツアー（2回目）",
    "在学生の案内でキャンパスの施設を見学します。",
    "main_ubic_entrance",
    ["tour"],
    [slot("11:10", "11:40")],
  ),
  event(
    "T3",
    "キャンパスツアー（3回目）",
    "在学生の案内でキャンパスの施設を見学します。",
    "main_ubic_entrance",
    ["tour"],
    [slot("13:50", "14:20")],
  ),
  event(
    "M21",
    "賽投げの確率幾何から紐解くガウス和ヤコビ和（可知 靖之）",
    "確率問題を入口に、大学数学のガウス和・ヤコビ和を体験します。",
    "lh_room_m2",
    ["trial"],
    [slot("11:00", "11:50")],
  ),
  event(
    "M22",
    "賽投げの確率幾何から紐解くガウス和ヤコビ和（可知 靖之）",
    "確率問題を入口に、大学数学のガウス和・ヤコビ和を体験します。",
    "lh_room_m2",
    ["trial"],
    [slot("14:00", "14:50")],
  ),
  event(
    "M31",
    "英語を話す練習をしましょう！（キルパトリック アレクサンダー）",
    "発音練習を通して会津大学の英語授業を体験します。",
    "lh_room_m3",
    ["trial"],
    [slot("11:00", "11:50")],
  ),
  event(
    "M32",
    "英語授業を体験してみよう！（カー ニコラス）",
    "実際のアクティビティで英語カリキュラムを体験します。",
    "lh_room_m3",
    ["trial"],
    [slot("13:00", "13:50")],
  ),
  event(
    "M41",
    "会津大の英語―英語の授業をのぞいてみよう！（金子 恵美子）",
    "授業映像を見ながら会津大学の英語教育を紹介します。",
    "lh_room_m4",
    ["trial"],
    [slot("12:00", "12:50")],
  ),
  event(
    "M42",
    "脳波でわかる「あれ、アクセント違わない？」（陳 姿因）",
    "脳波計測を用いた言語研究を体験します。",
    "lh_room_m4",
    ["trial"],
    [slot("14:00", "14:50")],
  ),
  event(
    "M51",
    "会津大学では何を学ぶのか ― ソフトウェアの視点から（渡部 有隆）",
    "プログラミングとソフトウェア工学を中心に学びを紹介します。",
    "lh_room_m5",
    ["trial"],
    [slot("12:00", "12:50")],
  ),
  event(
    "M52",
    "会津大学では何を学ぶのか ― ソフトウェアの視点から（渡部 有隆）",
    "プログラミングとソフトウェア工学を中心に学びを紹介します。",
    "lh_room_m5",
    ["trial"],
    [slot("13:00", "13:50")],
  ),
  event(
    "M61",
    "ざっくり分かるAIの仕組み（富岡 洋一）",
    "数式を使わずにAIの仕組みと応用例を紹介します。",
    "lh_room_m6",
    ["trial"],
    [slot("11:00", "11:50")],
  ),
  event(
    "M62",
    "ざっくり分かるAIの仕組み（富岡 洋一）",
    "数式を使わずにAIの仕組みと応用例を紹介します。",
    "lh_room_m6",
    ["trial"],
    [slot("13:00", "13:50")],
  ),
  event(
    "M71",
    "はやぶさ／はやぶさ2、月火星その先へ（出村 裕英）",
    "会津大学が取り組む小惑星・月探査の成果を紹介します。",
    "lh_room_m7",
    ["trial"],
    [slot("12:00", "12:50")],
  ),
  event(
    "M72",
    "はやぶさ／はやぶさ2、月火星その先へ（出村 裕英）",
    "会津大学が取り組む小惑星・月探査の成果を紹介します。",
    "lh_room_m7",
    ["trial"],
    [slot("14:00", "14:50")],
  ),
  event(
    "G1",
    "なんでも相談会（1回目）",
    "受験生や保護者の質問に会津大学の女子学生が答えます。",
    "ubic_room_3dtheater",
    ["consult"],
    [slot("10:20", "10:50")],
  ),
  event(
    "G2",
    "なんでも相談会（2回目）",
    "受験生や保護者の質問に会津大学の女子学生が答えます。",
    "ubic_room_3dtheater",
    ["consult"],
    [slot("13:00", "13:30")],
  ),
  ...consultationEvents,
  event(
    "W",
    "休憩所",
    "学生ホール食堂を休憩所として利用できます。",
    "sh_room_cafeteria",
    ["service"],
    [slot("08:30", "11:00"), slot("13:30", "15:00")],
  ),
  event(
    "P",
    "ランチ営業（Rat-a-tat）",
    "学生ホール食堂でランチを提供します。",
    "sh_room_cafeteria",
    ["service"],
    [slot("11:00", "13:30")],
  ),
  event(
    "S",
    "売店営業",
    "学生ホール売店を利用できます。",
    "sh_room_shop",
    ["service"],
    [slot("09:00", "15:00")],
  ),
  event(
    "service-map-guide",
    "オープンキャンパス地図アプリ解説",
    "学生ホールきやれにて、地図アプリの使い方を解説します。",
    "sh_room_kiyare",
    ["service"],
    [slot("09:00", "15:00")],
  ),
];
