import { useSearchParams } from "react-router";
import { useCampusData } from "../data/DataProvider";
import { getPlace } from "../data/places";
import type { Event as CampusEvent, Place } from "../data/types";

export type NavState = {
  /** ?at=placeId から導出した現在地 */
  currentPlace: Place | null;
  /** ?to=eventKey から導出した目的地イベント */
  destinationEvent: CampusEvent | null;
  /** 目的地イベントの会場 */
  destinationPlace: Place | null;
  /** ?focus=placeId から導出した地図の注目地点 */
  focusPlace: Place | null;
  /** イベントデータ取得中はtrue(目的地の判定が未確定) */
  loading: boolean;
  error: string | null;
};

/**
 * アプリの中心状態「現在地」「目的地」をURLクエリから導出する(SPEC.md 3.2, 5.2)。
 * URLが状態の正であり、このフックはそれを読むだけ。書き込みはnavigate側で行う。
 */
export function useNavState(): NavState {
  const [searchParams] = useSearchParams();
  const { events, loading: dataLoading, error: dataError } = useCampusData();

  const at = searchParams.get("at");
  const to = searchParams.get("to");
  const focus = searchParams.get("focus");

  const currentPlace = at ? (getPlace(at) ?? null) : null;
  const destinationEvent =
    to ? (events.find((event) => event.key === to) ?? null) : null;
  const destinationPlace = destinationEvent
    ? (getPlace(destinationEvent.placeId) ?? null)
    : null;
  const focusPlace = focus ? (getPlace(focus) ?? null) : null;

  let error = dataError;
  if (!error && at && !currentPlace) {
    error = `現在地「${at}」は登録されていません。`;
  } else if (!error && to && !dataLoading && !destinationEvent) {
    error = `目的地イベント「${to}」は登録されていません。`;
  } else if (!error && focus && !focusPlace) {
    error = `地点「${focus}」は登録されていません。`;
  }

  return {
    currentPlace,
    destinationEvent,
    destinationPlace,
    focusPlace,
    loading: to !== null && dataLoading,
    error,
  };
}
