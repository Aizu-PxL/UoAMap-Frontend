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
    // 添付のcalendar_month_24dpアイコン。リストと同じ24×24座標系で描画する。
    return (
      <svg className="sheet-icon sheet-icon--calendar" viewBox="0 -960 960 960" aria-hidden="true">
        <path d="M200-80q-33 0-56.5-23.5T120-160v-560q0-33 23.5-56.5T200-800h40v-80h80v80h320v-80h80v80h40q33 0 56.5 23.5T840-720v560q0 33-23.5 56.5T760-80H200Zm0-80h560v-400H200v400Zm0-480h560v-80H200v80Zm0 0v-80 80Zm280 240q-17 0-28.5-11.5T440-440q0-17 11.5-28.5T480-480q17 0 28.5 11.5T520-440q0 17-11.5 28.5T480-400Zm-188.5-11.5Q280-423 280-440t11.5-28.5Q303-480 320-480t28.5 11.5Q360-457 360-440t-11.5 28.5Q337-400 320-400t-28.5-11.5ZM640-400q-17 0-28.5-11.5T600-440q0-17 11.5-28.5T640-480q17 0 28.5 11.5T680-440q0 17-11.5 28.5T640-400ZM480-240q-17 0-28.5-11.5T440-280q0-17 11.5-28.5T480-320q17 0 28.5 11.5T520-280q0 17-11.5 28.5T480-240Zm-188.5-11.5Q280-263 280-280t11.5-28.5Q303-320 320-320t28.5 11.5Q360-297 360-280t-11.5 28.5Q337-240 320-240t-28.5-11.5ZM640-240q-17 0-28.5-11.5T600-280q0-17 11.5-28.5T640-320q17 0 28.5 11.5T680-280q0 17-11.5 28.5T640-240Z" />
      </svg>
    );
  }

  return (
    <svg className="sheet-icon sheet-icon--qr" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9.5 6.5v3h-3v-3h3M11 5H5v6h6V5zm-1.5 9.5v3h-3v-3h3M11 13H5v6h6v-6zm6.5-6.5v3h-3v-3h3M19 5h-6v6h6V5zm-6 8h1.5v1.5H13V13zm1.5 1.5H16V16h-1.5v-1.5zM16 13h1.5v1.5H16V13zm-3 3h1.5v1.5H13V16zm1.5 1.5H16V19h-1.5v-1.5zM16 16h1.5v1.5H16V16zm1.5-1.5H19V16h-1.5v-1.5zm0 3H19V19h-1.5v-1.5zM22 7h-2V4h-3V2h5v5zm0 15v-5h-2v3h-3v2h5zM2 22h5v-2H4v-3H2v5zM2 2v5h2V4h3V2H2z" />
    </svg>
  );
}
