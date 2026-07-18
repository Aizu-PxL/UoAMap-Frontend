import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { repository } from "./repository";
import type { Event as CampusEvent, Tag } from "./types";

type CampusData = {
  events: CampusEvent[];
  tags: Tag[];
  loading: boolean;
  error: string | null;
};

const CampusDataContext = createContext<CampusData | null>(null);

let campusDataPromise: Promise<[CampusEvent[], Tag[]]> | null = null;

function loadCampusData(): Promise<[CampusEvent[], Tag[]]> {
  campusDataPromise ??= Promise.all([repository.getEvents(), repository.getTags()]);
  return campusDataPromise;
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadCampusData()
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
  }, []);

  const value = useMemo(
    () => ({ events, tags, loading, error }),
    [events, tags, loading, error],
  );

  return <CampusDataContext.Provider value={value}>{children}</CampusDataContext.Provider>;
}

export function useCampusData(): CampusData {
  const data = useContext(CampusDataContext);
  if (!data) {
    throw new Error("useCampusData must be used inside DataProvider");
  }
  return data;
}
