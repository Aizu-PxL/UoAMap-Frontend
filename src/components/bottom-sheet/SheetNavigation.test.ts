import { describe, expect, test } from "bun:test";
import { getActiveTab } from "./SheetNavigation";

describe("getActiveTab", () => {
  test("イベント一覧・正式ID詳細・内部key詳細を検索タブとして扱う", () => {
    expect(getActiveTab("/events")).toEqual("search");
    expect(getActiveTab("/e/P1")).toEqual("search");
    expect(getActiveTab("/events/service-lunch")).toEqual("search");
  });
});
