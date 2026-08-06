import { describe, expect, test } from "bun:test";
import type { Event as CampusEvent } from "../../data/types";
import { filterEventsByCriteria } from "./eventSearch";

const events: CampusEvent[] = [
  {
    key: "P1",
    id: "P1",
    title: "Open Lab",
    description: "AI Research",
    placeId: "research-place",
    tags: ["P", "A"],
    timeSlots: [],
  },
  {
    key: "T2",
    id: "T2",
    title: "キャンパス案内",
    description: "Campus Tour",
    placeId: "student-place",
    tags: ["A", "T"],
    timeSlots: [],
  },
  {
    key: "M3",
    id: "M3",
    title: "AI体験",
    description: "Hands-on",
    placeId: "unknown-place",
    tags: ["M", "A"],
    timeSlots: [],
  },
];

const placeNames: Record<string, string> = {
  "research-place": "Research Quad",
  "student-place": "Student Hall",
};

const resolvePlaceName = (placeId: string) => placeNames[placeId] ?? null;

describe("filterEventsByCriteria", () => {
  test("ID・タイトル・説明・地点名へtrimと大文字小文字非依存で部分一致する", () => {
    expect(
      filterEventsByCriteria(events, { query: " p1 ", tagIds: [] }, resolvePlaceName).map(
        (event) => event.id,
      ),
    ).toEqual(["P1"]);
    expect(
      filterEventsByCriteria(events, { query: "OPEN LAB", tagIds: [] }, resolvePlaceName).map(
        (event) => event.id,
      ),
    ).toEqual(["P1"]);
    expect(
      filterEventsByCriteria(events, { query: "campus tour", tagIds: [] }, resolvePlaceName).map(
        (event) => event.id,
      ),
    ).toEqual(["T2"]);
    expect(
      filterEventsByCriteria(
        events,
        { query: "research quad", tagIds: [] },
        resolvePlaceName,
      ).map((event) => event.id),
    ).toEqual(["P1"]);
  });

  test("空白だけのqueryは全件を入力順で返す", () => {
    expect(
      filterEventsByCriteria(events, { query: "  \t ", tagIds: [] }, resolvePlaceName).map(
        (event) => event.id,
      ),
    ).toEqual(["P1", "T2", "M3"]);
  });

  test("複数タグはANDで絞り、queryとの併用でも入力順を維持する", () => {
    expect(
      filterEventsByCriteria(
        events,
        { query: "ai", tagIds: ["A"] },
        resolvePlaceName,
      ).map((event) => event.id),
    ).toEqual(["P1", "M3"]);
    expect(
      filterEventsByCriteria(
        events,
        { query: "", tagIds: ["A", "T"] },
        resolvePlaceName,
      ).map((event) => event.id),
    ).toEqual(["T2"]);
  });

  test("未知タグは0件になり、未知地点は他フィールドだけを検索する", () => {
    expect(
      filterEventsByCriteria(
        events,
        { query: "", tagIds: ["missing"] },
        resolvePlaceName,
      ),
    ).toEqual([]);
    expect(
      filterEventsByCriteria(
        events,
        { query: "hands", tagIds: [] },
        resolvePlaceName,
      ).map((event) => event.id),
    ).toEqual(["M3"]);
  });

  test("数字を含むqueryはID一致を優先し、全角数字も正規化する", () => {
    expect(
      filterEventsByCriteria(
        [
          ...events,
          {
            key: "service-2026",
            title: "2026年度案内",
            description: "数字を含む運営案内",
            placeId: "unknown-place",
            tags: [],
            timeSlots: [],
          },
        ],
        { query: "1", tagIds: [] },
        resolvePlaceName,
      ).map((event) => event.id ?? event.key),
    ).toEqual(["P1"]);
    expect(
      filterEventsByCriteria(events, { query: "３", tagIds: [] }, resolvePlaceName).map(
        (event) => event.id,
      ),
    ).toEqual(["M3"]);
  });

  test("数字のID一致がなければ従来の全文検索へfallbackする", () => {
    expect(
      filterEventsByCriteria(
        [
          ...events,
          {
            key: "service-2026",
            title: "2026年度案内",
            description: "数字を含む運営案内",
            placeId: "unknown-place",
            tags: [],
            timeSlots: [],
          },
        ],
        { query: "２０２６", tagIds: [] },
        resolvePlaceName,
      ).map((event) => event.id ?? event.key),
    ).toEqual(["service-2026"]);
  });
});
