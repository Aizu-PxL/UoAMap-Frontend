import { Navigate, Route, Routes, useLocation } from "react-router";
import { EventDetail } from "../features/events/EventDetail";
import { SearchPanel } from "../features/events/SearchPanel";
import { MapPanel } from "../features/map/MapPanel";
import { QrPanel } from "../features/qr/QrPanel";
import { SchedulePanel } from "../features/schedule/SchedulePanel";
import { AppLayout } from "./AppLayout";
import { PlaceLanding, QrLanding } from "./landings";

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<MapPanel />} />
        <Route path="/events" element={<SearchPanel />} />
        <Route path="/events/:eventKey" element={<EventDetail />} />
        <Route path="/e/:eventId" element={<EventDetail />} />
        <Route path="/qr" element={<QrPanel />} />
        <Route path="/schedule" element={<SchedulePanel />} />
        <Route path="/q/:qrId" element={<QrLanding />} />
        <Route path="/p/:placeId" element={<PlaceLanding />} />
        <Route path="*" element={<UnknownRoute />} />
      </Route>
    </Routes>
  );
}

function UnknownRoute() {
  const location = useLocation();
  return <Navigate to={{ pathname: "/", search: location.search }} replace />;
}
