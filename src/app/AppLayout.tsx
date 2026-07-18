import { Outlet } from "react-router";
import { BottomSheet } from "../components/bottom-sheet/BottomSheet";

export function AppLayout() {
  return (
    <main className="app-shell">
      {/* 地図キャンバス(ステップ2で実装)。全画面共通の背面レイヤー */}
      <div className="map-canvas">
        <p>地図は準備中です</p>
      </div>
      <BottomSheet>
        <Outlet />
      </BottomSheet>
    </main>
  );
}
