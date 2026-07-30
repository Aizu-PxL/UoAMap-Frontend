import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import type { BottomSheetSnapPoint } from "../components/bottom-sheet/bottomSheetGeometry";

type LayoutControl = {
  requestBottomSheetSnap: (snapPoint: BottomSheetSnapPoint) => void;
};

const LayoutControlContext = createContext<LayoutControl | null>(null);

export function LayoutControlProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: LayoutControl;
}) {
  return (
    <LayoutControlContext.Provider value={value}>
      {children}
    </LayoutControlContext.Provider>
  );
}

export function useLayoutControl(): LayoutControl {
  const value = useContext(LayoutControlContext);
  if (!value) {
    throw new Error("LayoutControlProviderが必要です");
  }
  return value;
}
