// SPEC.md 4章のエンティティ定義。
// MapSheet/Floor/Place/RouteNode/RouteEdge はSVG由来の静的データ、
// Event/Tag/QrCode はバックエンド(完成まではモック)から取得する。

export type MapSheet = {
  id: string;
  name: string;
  svgUrl: string;
};

export type Floor = {
  id: string;
  sheetId: string;
  name: string;
};

type PlaceBase = {
  id: string;
  floorId: string;
  name: string;
};

export type Place = PlaceBase &
  (
    | {
        /** ステップ2で位置アンカーを確定する仮地点 */
        mapping: "unmapped";
        svgElementId?: never;
        coordinates?: never;
      }
    | {
        mapping: "svg";
        svgElementId: string;
        coordinates?: never;
      }
    | {
        mapping: "coordinates";
        svgElementId?: never;
        coordinates: {
          x: number;
          y: number;
        };
      }
  );
export type TimeSlot = {
  /** ISO 8601 */
  start: string;
  /** 公式情報に終了時刻がない場合は省略する */
  end?: string;
};

export type Event = {
  id: string;
  title: string;
  description: string;
  placeId: string;
  tags: string[];
  /** 複数回開催・休憩を挟む開催は複数スロットで表現する */
  timeSlots: TimeSlot[];
};

export type Tag = {
  id: string;
  label: string;
};

export type QrCode = {
  qrId: string;
  placeId: string;
  kind: "fixed" | "variable";
  installationNote: string;
};

/** GET /api/qrs/{qrId} の公開レスポンス */
export type QrResolution = {
  qrId: string;
  placeId: string;
};

export type RouteNodeKind = "corridor" | "stairs" | "entrance";

export type RouteNode = {
  id: string;
  floorId: string;
  x: number;
  y: number;
  kind: RouteNodeKind;
  /** このノードを現在地・目的地として使うPlace。1 Placeにつき1ノード */
  placeId?: string;
};

export type RouteEdge =
  | {
      id: string;
      kind: "walk";
      floorId: string;
      nodeA: string;
      nodeB: string;
      distance: number;
      /** Routeレイヤーから抽出した、同じviewBox座標系の直線path */
      pathD: string;
    }
  | {
      id: string;
      kind: "transfer";
      nodeA: string;
      nodeB: string;
      distance: number;
    };

export type RouteGraph = {
  nodes: RouteNode[];
  edges: RouteEdge[];
};
