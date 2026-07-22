import type { Repository } from "./repository";
import type { Event as CampusEvent, Tag } from "./types";

export type CampusDataResult = [events: CampusEvent[], tags: Tag[]];

export type RepositoryLoader = {
  loadCampusData(): Promise<CampusDataResult>;
};

export function createRepositoryLoader(
  repository: Repository,
): RepositoryLoader {
  let campusDataPromise: Promise<CampusDataResult> | null = null;

  return {
    loadCampusData() {
      campusDataPromise ??= Promise.all([
        repository.getEvents(),
        repository.getTags(),
      ]);
      return campusDataPromise;
    },
  };
}
