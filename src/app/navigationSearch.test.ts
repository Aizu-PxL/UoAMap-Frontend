import { describe, expect, test } from "bun:test";
import {
  createDestinationNavigation,
  createNextMapFocusRequestState,
  createResolvedQrNavigation,
  getEntrySheetSnapPoint,
  getEventDetailPath,
  isNewMapFocusRequest,
  setDestinationSearchParams,
  setEventHighlightSearchParams,
  setFocusSearchParams,
  setResolvedQrSearchParams,
} from "./navigationSearch";

describe("URL状態更新", () => {
  test("目的地を置き換え、focusだけを削除して他のクエリを保持する", () => {
    const current = new URLSearchParams(
      "at=sh_reception&to=old&focus=rq_room_161&highlight=P1&source=poster",
    );

    const result = setDestinationSearchParams(current, "M21");

    expect(result === current).toEqual(false);
    expect(result.toString()).toEqual(
      "at=sh_reception&to=M21&highlight=P1&source=poster",
    );
    expect(current.toString()).toEqual(
      "at=sh_reception&to=old&focus=rq_room_161&highlight=P1&source=poster",
    );
  });

  test("地点フォーカスを置き換えて全既存クエリを保持する", () => {
    const current = new URLSearchParams(
      "at=sh_reception&to=M21&focus=old&highlight=P1&source=poster",
    );

    const result = setFocusSearchParams(current, "rq_room_161");

    expect(result.toString()).toEqual(
      "at=sh_reception&to=M21&focus=rq_room_161&highlight=P1&source=poster",
    );
    expect(current.get("focus")).toEqual("old");
  });

  test("QR解決後はatだけを置き換え、focusを削除してtoと他のクエリを保持する", () => {
    const current = new URLSearchParams(
      "at=sh_reception&to=M21&focus=rq_room_161&highlight=P1&source=poster",
    );

    const result = setResolvedQrSearchParams(current, "lh_room_lth_1");

    expect(result.toString()).toEqual(
      "at=lh_room_lth_1&to=M21&highlight=P1&source=poster",
    );
    expect(current.toString()).toEqual(
      "at=sh_reception&to=M21&focus=rq_room_161&highlight=P1&source=poster",
    );
  });

  test("MapCanvasのイベントhighlightを追加・置換して他のクエリと順序を保持する", () => {
    const current = new URLSearchParams(
      "at=rq_room_161&to=P21&focus=lictia_room_cswr&source=map",
    );

    const result = setEventHighlightSearchParams(current, "P20");

    expect(result.toString()).toEqual(
      "at=rq_room_161&to=P21&focus=lictia_room_cswr&source=map&highlight=P20",
    );
    expect(current.has("highlight")).toEqual(false);

    const currentWithHighlight = new URLSearchParams(
      "at=rq_room_161&highlight=old&to=P21&source=map",
    );
    const replaced = setEventHighlightSearchParams(
      currentWithHighlight,
      "P20",
    );

    expect(replaced.toString()).toEqual(
      "at=rq_room_161&highlight=P20&to=P21&source=map",
    );
    expect(currentWithHighlight.get("highlight")).toEqual("old");
  });
});

describe("目的地から経路案内への遷移", () => {
  test("Route対応現在地があれば地図へ戻して現在地注目と22svhを要求する", () => {
    const current = new URLSearchParams("at=main_node_11&focus=old&source=detail");
    const result = createDestinationNavigation(current, "P1", "main_node_11");

    expect(result.pathname).toEqual("/");
    expect(result.searchParams.toString()).toEqual(
      "at=main_node_11&source=detail&to=P1",
    );
    expect(result.sheetSnapPoint).toEqual(22);
    expect(result.mapFocusPlaceId).toEqual("main_node_11");
  });

  test("現在地がなければ目的地を保持してQRと82svhを要求する", () => {
    const result = createDestinationNavigation(
      new URLSearchParams("source=detail"),
      "service-lunch",
      null,
    );

    expect(result.pathname).toEqual("/qr");
    expect(result.searchParams.toString()).toEqual(
      "source=detail&to=service-lunch",
    );
    expect(result.sheetSnapPoint).toEqual(82);
    expect(result.mapFocusPlaceId).toEqual(undefined);
  });

  test("QR解決後は現在地と目的地を保持して現在地注目と22svhを要求する", () => {
    const result = createResolvedQrNavigation(
      new URLSearchParams("to=P1&focus=old"),
      "main_node_11",
    );

    expect(result.pathname).toEqual("/");
    expect(result.searchParams.toString()).toEqual("to=P1&at=main_node_11");
    expect(result.sheetSnapPoint).toEqual(22);
    expect(result.mapFocusPlaceId).toEqual("main_node_11");
  });

  test("イベント詳細は正式IDと内部keyで正規ルートを分ける", () => {
    expect(getEventDetailPath("P1", "P1")).toEqual("/e/P1");
    expect(getEventDetailPath("service lunch")).toEqual(
      "/events/service%20lunch",
    );
  });

  test("QRとイベント詳細への入場だけ82svhを要求する", () => {
    expect(getEntrySheetSnapPoint("/qr")).toEqual(82);
    expect(getEntrySheetSnapPoint("/e/P1")).toEqual(82);
    expect(getEntrySheetSnapPoint("/events/service-lunch")).toEqual(82);
    expect(getEntrySheetSnapPoint("/")).toEqual(null);
    expect(getEntrySheetSnapPoint("/events")).toEqual(null);
    expect(getEntrySheetSnapPoint("/q/Q001")).toEqual(null);
  });
});

describe("地図の再フォーカス要求", () => {
  test("呼び出しごとに相異なる単調増加のnonceを発行する", () => {
    const first = createNextMapFocusRequestState();
    const second = createNextMapFocusRequestState();
    const third = createNextMapFocusRequestState("main_node_11");

    expect(second.mapFocusRequestNonce > first.mapFocusRequestNonce).toEqual(
      true,
    );
    expect(third.mapFocusRequestNonce > second.mapFocusRequestNonce).toEqual(
      true,
    );
  });

  test("mapFocusPlaceIdは指定時のみ含まれ、余分なキーを持たない", () => {
    const withoutPlace = createNextMapFocusRequestState();
    expect(Object.keys(withoutPlace)).toEqual(["mapFocusRequestNonce"]);

    const withPlace = createNextMapFocusRequestState("main_node_11");
    expect(withPlace.mapFocusPlaceId).toEqual("main_node_11");
    expect(Object.keys(withPlace).sort()).toEqual([
      "mapFocusPlaceId",
      "mapFocusRequestNonce",
    ]);
  });

  test("isNewMapFocusRequestはstateなし(0)と処理済みnonceを弾く", () => {
    expect(isNewMapFocusRequest(5, 0)).toEqual(false);
    expect(isNewMapFocusRequest(5, 5)).toEqual(false);
    expect(isNewMapFocusRequest(5, 6)).toEqual(true);
    expect(isNewMapFocusRequest(6, 5)).toEqual(true);
  });
});
