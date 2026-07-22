import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Repository } from "./repository";
import { createRepositoryLoader } from "./repositoryLoader";
import type { Event as CampusEvent, Tag } from "./types";

type CampusData = {
  events: CampusEvent[];
  tags: Tag[];
  loading: boolean;
  error: string | null;
};

const CampusDataContext = createContext<CampusData | null>(null);
const RepositoryContext = createContext<Repository | null>(null);

export function DataProvider({
  children,
  repository,
}: {
  children: ReactNode;
  repository: Repository;
}) {
  const loader = useMemo(() => createRepositoryLoader(repository), [repository]);
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    loader
      .loadCampusData()
      .then(([loadedEvents, loadedTags]) => {
        if (cancelled) {
          return;
        }
        setEvents(loadedEvents);
        setTags(loadedTags);
      })
      .catch(() => {
        if (!cancelled) {
          setError("イベント情報の読み込みに失敗しました。");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [loader]);

  const value = useMemo(
    () => ({ events, tags, loading, error }),
    [events, tags, loading, error],
  );

  return (
    <RepositoryContext.Provider value={repository}>
      <CampusDataContext.Provider value={value}>
        {children}
      </CampusDataContext.Provider>
    </RepositoryContext.Provider>
  );
}

export function useCampusData(): CampusData {
  const data = useContext(CampusDataContext);
  if (!data) {
    throw new Error("useCampusData must be used inside DataProvider");
  }
  return data;
}

export function useRepository(): Repository {
  const repository = useContext(RepositoryContext);
  if (!repository) {
    throw new Error("useRepository must be used inside DataProvider");
  }
  return repository;
}
