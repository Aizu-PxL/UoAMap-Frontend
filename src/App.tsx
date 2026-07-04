import { useState } from "react";
import { BottomSheet } from "./components/bottom-sheet/BottomSheet";
import type { BottomSheetTab } from "./components/bottom-sheet/types";

export function App() {
  const [activeTab, setActiveTab] = useState<BottomSheetTab>("qr");

  return (
    <main className="app-shell">
      <BottomSheet activeTab={activeTab} onTabChange={setActiveTab} />
    </main>
  );
}
