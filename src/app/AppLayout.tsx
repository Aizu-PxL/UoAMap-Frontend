import { type CSSProperties, useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router";
import { BottomSheet } from "../components/bottom-sheet/BottomSheet";
import { useCampusData } from "../data/DataProvider";
import { MapCanvas } from "../features/map/MapCanvas";
import { useNavState } from "./useNavState";

export function AppLayout() {
  const [floorId, setFloorId] = useState("campus");
  const [bottomSheetHeight, setBottomSheetHeight] = useState(58);
  const location = useLocation();
  const { events } = useCampusData();
  const { currentPlace, destinationPlace, focusPlace } = useNavState();

  const prioritizedPlace = focusPlace ?? destinationPlace ?? currentPlace;
  const navigationParams = new URLSearchParams(location.search);
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

  useEffect(() => {
    if (prioritizedPlace) {
      setFloorId(prioritizedPlace.floorId);
    } else if (!hasNavigationParams) {
      setFloorId("campus");
    }
  }, [hasNavigationParams, prioritizedPlace]);

  return (
    <main className="app-shell" style={appShellStyle}>
      {/* 地図キャンバス。全画面共通の背面レイヤー */}
      <MapCanvas
        floorId={floorId}
        onFloorChange={setFloorId}
        currentPlace={currentPlace}
        destinationPlace={destinationPlace}
        focusPlace={focusPlace}
        focusRequestNonce={focusRequestNonce}
        events={events}
      />
      <BottomSheet onHeightChange={setBottomSheetHeight}>
        <Outlet />
      </BottomSheet>
    </main>
  );
}
