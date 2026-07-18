import { Link, useLocation } from "react-router";

type SheetNavigationProps = {
  onNavigate: () => void;
};

type Tab = {
  id: "search" | "qr" | "map" | "schedule";
  label: string;
  path: string;
  icon: "list" | "qr" | "map" | "calendar";
};

const tabs: Tab[] = [
  { id: "search", label: "Search", path: "/events", icon: "list" },
  { id: "qr", label: "QR", path: "/qr", icon: "qr" },
  { id: "map", label: "Map", path: "/", icon: "map" },
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
            onClick={onNavigate}
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

function getActiveTab(pathname: string): Tab["id"] {
  if (pathname === "/events" || pathname.startsWith("/e/")) {
    return "search";
  }
  if (pathname === "/qr" || pathname.startsWith("/q/")) {
    return "qr";
  }
  if (pathname === "/schedule") {
    return "schedule";
  }
  return "map";
}

function SheetIcon({ name }: { name: Tab["icon"] }) {
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

  if (name === "calendar") {
    return (
      <svg className="sheet-icon" viewBox="0 0 32 32" aria-hidden="true">
        <rect x="5" y="7" width="22" height="20" rx="2" />
        <path d="M10 4v6M22 4v6M5 13h22M10 18h3M16 18h3M22 18h1M10 23h3M16 23h3" />
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
