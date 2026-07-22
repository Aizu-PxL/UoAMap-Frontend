import { describe, expect, test } from "bun:test";
import type { Event as CampusEvent } from "../../data/types";
import { filterEventsByCriteria } from "./eventSearch";

const events: CampusEvent[] = [
  {
    id: "A1",
    title: "Open Lab",
    description: "AI Research",
    placeId: "research-place",
    tags: ["openlab", "info"],
    timeSlots: [],
  },
  {
    id: "B2",
    title: "キャンパス案内",
    description: "Campus Tour",
    placeId: "student-place",
    tags: ["info", "tour"],
    timeSlots: [],
  },
  {
    id: "C3",
    title: "AI体験",
    description: "Hands-on",
    placeId: "unknown-place",
    tags: ["trial", "info"],
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
      filterEventsByCriteria(events, { query: " a1 ", tagIds: [] }, resolvePlaceName).map(
        (event) => event.id,
      ),
    ).toEqual(["A1"]);
    expect(
      filterEventsByCriteria(events, { query: "OPEN LAB", tagIds: [] }, resolvePlaceName).map(
        (event) => event.id,
      ),
    ).toEqual(["A1"]);
    expect(
      filterEventsByCriteria(events, { query: "campus tour", tagIds: [] }, resolvePlaceName).map(
        (event) => event.id,
      ),
    ).toEqual(["B2"]);
    expect(
      filterEventsByCriteria(
        events,
        { query: "research quad", tagIds: [] },
        resolvePlaceName,
      ).map((event) => event.id),
    ).toEqual(["A1"]);
  });

  test("空白だけのqueryは全件を入力順で返す", () => {
    expect(
      filterEventsByCriteria(events, { query: "  \t ", tagIds: [] }, resolvePlaceName).map(
        (event) => event.id,
      ),
    ).toEqual(["A1", "B2", "C3"]);
  });

  test("複数タグはANDで絞り、queryとの併用でも入力順を維持する", () => {
    expect(
      filterEventsByCriteria(
        events,
        { query: "ai", tagIds: ["info"] },
        resolvePlaceName,
      ).map((event) => event.id),
    ).toEqual(["A1", "C3"]);
    expect(
      filterEventsByCriteria(
        events,
        { query: "", tagIds: ["info", "tour"] },
        resolvePlaceName,
      ).map((event) => event.id),
    ).toEqual(["B2"]);
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
    ).toEqual(["C3"]);
  });
});
