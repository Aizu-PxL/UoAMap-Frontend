import { Link, useLocation } from "react-router";
import { formatTimeSlots } from "../../data/format";
import { getPlace } from "../../data/places";
import type { Event as CampusEvent } from "../../data/types";

type EventCardProps = {
  event: CampusEvent;
  tagLabel: string;
};

export function EventCard({ event, tagLabel }: EventCardProps) {
  const location = useLocation();
  const place = getPlace(event.placeId);

  return (
    <Link
      className="event-card"
      to={{ pathname: `/e/${event.id}`, search: location.search }}
    >
      <h2>{event.title}</h2>
      <p>
        {formatTimeSlots(event.timeSlots)} <span>@{place?.name ?? event.placeId}</span>
      </p>
      <div className="event-card__tag">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 5h9l7 7-8 8-8-8V5Z" />
          <circle cx="9" cy="10" r="1.5" />
        </svg>
        {tagLabel}
      </div>
    </Link>
  );
}
