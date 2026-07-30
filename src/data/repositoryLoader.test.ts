import { describe, expect, test } from "bun:test";
import type { Repository } from "./repository";
import { createRepositoryLoader } from "./repositoryLoader";
import type { Event, Tag } from "./types";

const events: Event[] = [
  {
    key: "event-1",
    id: "event-1",
    title: "イベント",
    description: "説明",
    placeId: "place-1",
    tags: ["tag-1"],
    timeSlots: [],
  },
];

const tags: Tag[] = [{ id: "tag-1", label: "タグ" }];

function createCountingRepository() {
  let eventCalls = 0;
  let tagCalls = 0;

  const repository: Repository = {
    getEvents: async () => {
      eventCalls += 1;
      return events;
    },
    getTags: async () => {
      tagCalls += 1;
      return tags;
    },
    resolveQr: async () => null,
  };

  return {
    repository,
    getCalls: () => ({ eventCalls, tagCalls }),
  };
}

describe("createRepositoryLoader", () => {
  test("同一Provider相当の重複loadは同じPromiseを共有して各取得を1回だけ行う", async () => {
    const fixture = createCountingRepository();
    const loader = createRepositoryLoader(fixture.repository);

    const first = loader.loadCampusData();
    const second = loader.loadCampusData();

    expect(first === second).toEqual(true);
    expect(await first).toEqual([events, tags]);
    expect(fixture.getCalls()).toEqual({ eventCalls: 1, tagCalls: 1 });
  });

  test("別Provider相当のloader間では取得Promiseを共有しない", async () => {
    const fixture = createCountingRepository();
    const firstLoader = createRepositoryLoader(fixture.repository);
    const secondLoader = createRepositoryLoader(fixture.repository);

    await Promise.all([
      firstLoader.loadCampusData(),
      secondLoader.loadCampusData(),
    ]);

    expect(fixture.getCalls()).toEqual({ eventCalls: 2, tagCalls: 2 });
  });

  test("Repositoryの失敗を呼び出し側へ伝え、同じ失敗Promiseを再利用する", async () => {
    const failure = new Error("events failed");
    let eventCalls = 0;
    let tagCalls = 0;
    const repository: Repository = {
      getEvents: async () => {
        eventCalls += 1;
        throw failure;
      },
      getTags: async () => {
        tagCalls += 1;
        return tags;
      },
      resolveQr: async () => null,
    };
    const loader = createRepositoryLoader(repository);

    const first = loader.loadCampusData();
    const second = loader.loadCampusData();

    expect(first === second).toEqual(true);
    let caught: unknown;
    try {
      await first;
    } catch (error) {
      caught = error;
    }
    expect(caught).toEqual(failure);
    expect({ eventCalls, tagCalls }).toEqual({ eventCalls: 1, tagCalls: 1 });
  });
});
