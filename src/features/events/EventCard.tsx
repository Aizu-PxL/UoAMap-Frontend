import type { Ref } from "react";
import { Link, useLocation } from "react-router";
import { formatTimeSlots } from "../../data/format";
import { getPlace } from "../../data/places";
import type { Event as CampusEvent } from "../../data/types";

type EventCardProps = {
  event: CampusEvent;
  tagLabel: string;
  highlighted?: boolean;
  cardRef?: Ref<HTMLAnchorElement>;
};

export function EventCard({ event, tagLabel, highlighted = false, cardRef }: EventCardProps) {
  const location = useLocation();
  const place = getPlace(event.placeId);
  const pathname = event.id ? `/e/${event.id}` : `/events/${event.key}`;

  return (
    <Link
      ref={cardRef}
      className={highlighted ? "event-card is-highlighted" : "event-card"}
      data-event-key={event.key}
      data-event-id={event.id}
      to={{ pathname, search: location.search }}
    >
      <h2>{event.title}</h2>
      <p>
        {formatTimeSlots(event.timeSlots)} <span>@{place?.name ?? event.placeId}</span>
      </p>
      {tagLabel && (
        <div className="event-card__tag">
          <TagIcon />
          {tagLabel}
        </div>
      )}
    </Link>
  );
}

/* FigmaのIcon/Tagと同一パス */
export function TagIcon() {
  return (
    <svg viewBox="0 0 19 19" aria-hidden="true">
      <path d="M5.54 5.54h.01M16.3 10.62l-5.68 5.67a1.6 1.6 0 0 1-2.24 0L1.58 9.5V1.58H9.5l6.8 6.8a1.58 1.58 0 0 1 0 2.24Z" />
    </svg>
  );
}
