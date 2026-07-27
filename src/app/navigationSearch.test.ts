import { describe, expect, test } from "bun:test";
import {
  createNextMapFocusRequestState,
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

describe("地図の再フォーカス要求", () => {
  test("既存nonceを1増やし、それ以外のlocation stateは引き継がない", () => {
    expect(
      createNextMapFocusRequestState({
        mapFocusRequestNonce: 4,
        unrelated: "value",
      }),
    ).toEqual({ mapFocusRequestNonce: 5 });
  });

  test("nonceが未設定または数値でなければ1から開始する", () => {
    expect(createNextMapFocusRequestState(undefined)).toEqual({
      mapFocusRequestNonce: 1,
    });
    expect(
      createNextMapFocusRequestState({ mapFocusRequestNonce: "4" }),
    ).toEqual({ mapFocusRequestNonce: 1 });
  });
});
