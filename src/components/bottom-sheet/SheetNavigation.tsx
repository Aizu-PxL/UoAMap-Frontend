import type { BottomSheetTab } from "./types";

type SheetNavigationProps = {
  activeTab: BottomSheetTab;
  onTabChange: (tab: BottomSheetTab) => void;
};

const tabs: Array<{ id: BottomSheetTab; label: string; icon: "list" | "qr" | "map" }> = [
  { id: "search", label: "Search", icon: "list" },
  { id: "qr", label: "QR", icon: "qr" },
  { id: "map", label: "Map", icon: "map" },
];

export function SheetNavigation({ activeTab, onTabChange }: SheetNavigationProps) {
  return (
    <nav className="sheet-nav" aria-label="Bottom sheet navigation">
      {tabs.map((tab) => (
        <button
          aria-label={tab.label}
          aria-pressed={activeTab === tab.id}
          className="sheet-nav__button"
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          type="button"
        >
          <SheetIcon name={tab.icon} />
        </button>
      ))}
    </nav>
  );
}

function SheetIcon({ name }: { name: "list" | "qr" | "map" }) {
  if (name === "list") {
    return (
      <svg className="sheet-icon" viewBox="0 0 32 32" aria-hidden="true">
        <path d="M11 9h18M11 16h18M11 23h18" />
        <path d="M4 9h1M4 16h1M4 23h1" />
      </svg>
    );
  }

  if (name === "map") {
    return (
      <svg className="sheet-icon" viewBox="0 0 32 32" aria-hidden="true">
        <path d="M4 9.5 12 6l8 3.5L28 6v16.5L20 26l-8-3.5L4 26V9.5Z" />
        <path d="M12 6v16.5M20 9.5V26" />
      </svg>
    );
  }

  return (
    <svg className="sheet-icon sheet-icon--qr" viewBox="0 0 32 32" aria-hidden="true">
      <path d="M5 5h8v8H5V5ZM19 5h8v8h-8V5ZM5 19h8v8H5v-8Z" />
      <path d="M20 20h2M25 20h2M20 23h5M23 26h4" />
      <path d="M3 10V3h7M22 3h7v7M3 22v7h7M29 22v7h-7" />
    </svg>
  );
}
