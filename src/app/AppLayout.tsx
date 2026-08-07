import {
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Outlet, useLocation } from "react-router";
import { BottomSheet } from "../components/bottom-sheet/BottomSheet";
import type { BottomSheetSnapPoint } from "../components/bottom-sheet/bottomSheetGeometry";
import { useCampusData } from "../data/DataProvider";
import { getPlace } from "../data/places";
import { MapCanvas } from "../features/map/MapCanvas";
import { MapSheetControls } from "../features/map/MapSheetControls";
import { DEFAULT_FLOOR_ID } from "../features/map/mapFloorNavigation";
import { createMapNavigationPresentation } from "./mapNavigation";
import { useNavState } from "./useNavState";
import { LayoutControlProvider } from "./layoutControl";
import { getEntrySheetSnapPoint, isNewMapFocusRequest } from "./navigationSearch";

export function AppLayout() {
  const [floorId, setFloorId] = useState(DEFAULT_FLOOR_ID);
  const [bottomSheetHeight, setBottomSheetHeight] = useState(58);
  const [sheetSnapRequest, setSheetSnapRequest] = useState<{
    key: number;
    snapPoint: BottomSheetSnapPoint;
  } | null>(null);
  const location = useLocation();
  const { events } = useCampusData();
  const { currentPlace, destinationPlace, focusPlace } = useNavState();

  const requestedMapFocusPlaceId =
    typeof location.state?.mapFocusPlaceId === "string"
      ? location.state.mapFocusPlaceId
      : null;
  const requestedMapFocusPlace = requestedMapFocusPlaceId
    ? (getPlace(requestedMapFocusPlaceId) ?? null)
    : null;
  const navigationParams = new URLSearchParams(location.search);
  const expandRequestKey = navigationParams.get("highlight");
  const hasNavigationParams = ["at", "to", "focus"].some((param) =>
    navigationParams.has(param),
  );
  const focusRequestNonce =
    typeof location.state?.mapFocusRequestNonce === "number"
      ? location.state.mapFocusRequestNonce
      : 0;
  const appShellStyle = {
    "--bottom-sheet-height": `${bottomSheetHeight}svh`,
  } as CSSProperties;
  const requestBottomSheetSnap = useCallback((snapPoint: BottomSheetSnapPoint) => {
    setSheetSnapRequest((current) => ({
      key: (current?.key ?? 0) + 1,
      snapPoint,
    }));
  }, []);
  const layoutControl = useMemo(
    () => ({ requestBottomSheetSnap }),
    [requestBottomSheetSnap],
  );
  const { mapFocusPlace, routePresentation } = useMemo(
    () =>
      createMapNavigationPresentation({
        requestedFocusPlace: requestedMapFocusPlace,
        focusPlace,
        currentPlace,
        destinationPlace,
      }),
    [
      currentPlace,
      destinationPlace,
      focusPlace,
      requestedMapFocusPlace,
    ],
  );

  useEffect(() => {
    if (mapFocusPlace) {
      setFloorId(mapFocusPlace.floorId);
    } else if (!hasNavigationParams) {
      setFloorId(DEFAULT_FLOOR_ID);
    }
  }, [hasNavigationParams, mapFocusPlace]);

  // フォーカス要求(nonce)にもフロアを同期する。mapFocusPlaceの同一性が変わらない
  // 遷移(例: 建物タップでフロアだけ変えた後の「ここへ行く」)では上のエフェクトが
  // 発火しないため、要求単位で必ずフロアを合わせないとMapCanvas側のフロア不一致
  // ガードがリセンターを握りつぶす。
  const lastFloorSyncedNonceRef = useRef(0);
  useEffect(() => {
    if (!isNewMapFocusRequest(lastFloorSyncedNonceRef.current, focusRequestNonce)) {
      return;
    }
    lastFloorSyncedNonceRef.current = focusRequestNonce;
    if (mapFocusPlace) {
      setFloorId(mapFocusPlace.floorId);
    }
  }, [focusRequestNonce, mapFocusPlace]);

  useEffect(() => {
    const entrySnapPoint = getEntrySheetSnapPoint(location.pathname);
    if (entrySnapPoint !== null) {
      requestBottomSheetSnap(entrySnapPoint);
    }
  }, [location.pathname, requestBottomSheetSnap]);

  return (
    <LayoutControlProvider value={layoutControl}>
      <main className="app-shell" style={appShellStyle}>
        {/* 地図キャンバス。全画面共通の背面レイヤー */}
        <MapCanvas
          floorId={floorId}
          onFloorChange={setFloorId}
          currentPlace={currentPlace}
          destinationPlace={destinationPlace}
          mapFocusPlace={mapFocusPlace}
          focusPlace={focusPlace}
          focusRequestNonce={focusRequestNonce}
          events={events}
          routePresentation={routePresentation}
          onRequestBottomSheetSnap={requestBottomSheetSnap}
        />
        <BottomSheet
          expandRequestKey={expandRequestKey}
          onHeightChange={setBottomSheetHeight}
          snapRequest={sheetSnapRequest}
          topOverlay={
            floorId === DEFAULT_FLOOR_ID ? null : (
              <MapSheetControls floorId={floorId} onFloorChange={setFloorId} />
            )
          }
        >
          <Outlet />
        </BottomSheet>
      </main>
    </LayoutControlProvider>
  );
}
