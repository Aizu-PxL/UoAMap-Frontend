import { Link, useLocation } from "react-router";

type SheetNavigationProps = {
  onNavigate: (tabId: Tab["id"]) => void;
};

type Tab = {
  id: "search" | "qr" | "schedule";
  label: string;
  path: string;
  icon: "list" | "qr" | "calendar";
};

const tabs: Tab[] = [
  { id: "search", label: "Search", path: "/events", icon: "list" },
  { id: "qr", label: "QR", path: "/qr", icon: "qr" },
  { id: "schedule", label: "Schedule", path: "/schedule", icon: "calendar" },
];

export function SheetNavigation({ onNavigate }: SheetNavigationProps) {
  const location = useLocation();
  const activeTab = getActiveTab(location.pathname);

  return (
    <nav className="sheet-nav" aria-label="Bottom sheet navigation">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            aria-label={tab.label}
            className="sheet-nav__button"
            key={tab.id}
            onClick={() => onNavigate(tab.id)}
            replace={isActive}
            to={{ pathname: tab.path, search: location.search }}
          >
            <SheetIcon name={tab.icon} />
          </Link>
        );
      })}
    </nav>
  );
}

export function getActiveTab(pathname: string): Tab["id"] | null {
  if (
    pathname === "/events" ||
    pathname.startsWith("/events/") ||
    pathname.startsWith("/e/")
  ) {
    return "search";
  }
  if (pathname === "/qr" || pathname.startsWith("/q/")) {
    return "qr";
  }
  if (pathname === "/schedule") {
    return "schedule";
  }
  return null;
}

/* Material Icons(Figmaの list_24dp / qr_code_scanner_24dp / calendar と同一デザイン) */
function SheetIcon({ name }: { name: Tab["icon"] }) {
  if (name === "list") {
    return (
      <svg className="sheet-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" />
      </svg>
    );
  }

  if (name === "calendar") {
    // FigmaのIcon/Schedule(ストローク描画)をそのまま使用
    return (
      <svg className="sheet-icon sheet-icon--stroke" viewBox="0 0 43 43" aria-hidden="true">
        <path d="M30.5 12.5H12.5c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2v-16c0-1.1-.9-2-2-2Z" />
        <path d="M15.5 9.5v6M27.5 9.5v6M10.5 18.5h22M15.5 23.5h3M21.5 23.5h3M27.5 23.5h1M15.5 28.5h3M21.5 28.5h3" />
      </svg>
    );
  }

  return (
    <svg className="sheet-icon sheet-icon--qr" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9.5 6.5v3h-3v-3h3M11 5H5v6h6V5zm-1.5 9.5v3h-3v-3h3M11 13H5v6h6v-6zm6.5-6.5v3h-3v-3h3M19 5h-6v6h6V5zm-6 8h1.5v1.5H13V13zm1.5 1.5H16V16h-1.5v-1.5zM16 13h1.5v1.5H16V13zm-3 3h1.5v1.5H13V16zm1.5 1.5H16V19h-1.5v-1.5zM16 16h1.5v1.5H16V16zm1.5-1.5H19V16h-1.5v-1.5zm0 3H19V19h-1.5v-1.5zM22 7h-2V4h-3V2h5v5zm0 15v-5h-2v3h-3v2h5zM2 22h5v-2H4v-3H2v5zM2 2v5h2V4h3V2H2z" />
    </svg>
  );
}
