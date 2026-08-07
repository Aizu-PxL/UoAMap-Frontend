import { describe, expect, test } from "bun:test";
import {
  createQrLandingLocation,
  extractQrIdFromAppUrl,
} from "./qrValue";
import { setResolvedQrSearchParams } from "../../app/navigationSearch";

describe("extractQrIdFromAppUrl", () => {
  const appUrl = "https://map.example.jp/qr?to=M21";

  test("同一アプリのURL型QRからIDを取り出す", () => {
    expect(
      extractQrIdFromAppUrl(
        "https://map.example.jp/q/Q003",
        appUrl,
        "/",
      ),
    ).toEqual("Q003");
  });

  test("Viteのbase path配下にあるQRを扱う", () => {
    expect(
      extractQrIdFromAppUrl(
        "https://map.example.jp/uoamap/q/Q001?source=sign",
        "https://map.example.jp/uoamap/qr",
        "/uoamap/",
      ),
    ).toEqual("Q001");
  });

  test("ルート配信時も印刷QRの正式パスを扱う", () => {
    expect(
      extractQrIdFromAppUrl(
        "https://uoa-ocmap.com/UoAMap-Frontend/q/Q001",
        "https://uoa-ocmap.com/qr?to=M21",
        "/",
      ),
    ).toEqual("Q001");
  });

  test("同一originの相対URLも扱う", () => {
    expect(extractQrIdFromAppUrl("/q/Q002", appUrl, "/")).toEqual("Q002");
  });

  test("外部originのQRを拒否する", () => {
    expect(
      extractQrIdFromAppUrl(
        "https://example.com/UoAMap-Frontend/q/Q001",
        "https://uoa-ocmap.com/qr",
        "/",
      ),
    ).toBeNull();
  });

  test("別パス・空ID・余分なパス・不正値を拒否する", () => {
    const invalidValues = [
      "https://map.example.jp/p/Q001",
      "https://map.example.jp/q/",
      "https://map.example.jp/q/Q001/extra",
      "https://map.example.jp/q/Q001%2Fextra",
      "https://map.example.jp/UoAMap-Frontend/q/",
      "https://map.example.jp/UoAMap-Frontend/q/Q001/extra",
      "https://map.example.jp/UoAMap-Frontend/q/Q001%2Fextra",
      "https://map.example.jp/UoAMap-Frontend/p/Q001",
      "Q001",
    ];

    expect(
      invalidValues.map((value) =>
        extractQrIdFromAppUrl(value, appUrl, "/"),
      ),
    ).toEqual([null, null, null, null, null, null, null, null, null]);
  });
});

describe("QRスキャン後のURL状態", () => {
  test("既存クエリを保持してQR着地ルートへ遷移する", () => {
    expect(
      createQrLandingLocation(
        "Q003",
        "?at=sh_reception&to=M21&focus=rq_room_161",
      ),
    ).toEqual({
      pathname: "/q/Q003",
      search: "?at=sh_reception&to=M21&focus=rq_room_161",
    });
  });

  test("初回スキャンは現在地を追加して目的地を保持する", () => {
    const result = setResolvedQrSearchParams(
      new URLSearchParams("to=M21"),
      "lh_room_lth_1",
    );

    expect(result.get("at")).toEqual("lh_room_lth_1");
    expect(result.get("to")).toEqual("M21");
    expect(result.has("focus")).toEqual(false);
  });

  test("再スキャンは目的地を変えず現在地だけ更新しfocusを解除する", () => {
    const result = setResolvedQrSearchParams(
      new URLSearchParams("at=sh_reception&to=M21&focus=rq_room_161"),
      "lh_room_lth_1",
    );

    expect(result.get("at")).toEqual("lh_room_lth_1");
    expect(result.get("to")).toEqual("M21");
    expect(result.has("focus")).toEqual(false);
  });
});
