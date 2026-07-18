import { useEffect } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { useCampusData } from "../../data/DataProvider";
import { TagIcon } from "./EventCard";
import { formatTimeSlots } from "../../data/format";
import { getPlace } from "../../data/places";

export function EventDetail() {
  const { eventId } = useParams();
  const { events, tags, loading, error } = useCampusData();
  const location = useLocation();
  const navigate = useNavigate();
  const event = events.find((candidate) => candidate.id === eventId);

  useEffect(() => {
    if (!event) {
      return;
    }
    const params = new URLSearchParams(location.search);
    if (params.get("to") === event.id && !params.has("focus")) {
      return;
    }
    params.set("to", event.id);
    params.delete("focus");
    navigate(
      { pathname: location.pathname, search: params.toString() },
      { replace: true },
    );
  }, [event, location.pathname, location.search, navigate]);

  if (loading) {
    return <div className="landing-message">読み込み中…</div>;
  }

  if (error) {
    return (
      <div className="landing-message" role="alert">
        {error}
      </div>
    );
  }

  if (!event) {
    return (
      <div className="landing-message" role="alert">
        <p>イベント「{eventId}」が見つかりません。</p>
        <Link to={{ pathname: "/events", search: location.search }}>検索へ戻る</Link>
      </div>
    );
  }

  const place = getPlace(event.placeId);
  const tagLabels = event.tags.map(
    (id) => tags.find((tag) => tag.id === id)?.label ?? id,
  );

  const setDestination = () => {
    const params = new URLSearchParams(location.search);
    params.set("to", event.id);
    params.delete("focus");
    navigate({ pathname: "/", search: params.toString() });
  };

  return (
    <div className="event-detail">
      <Link className="event-detail__back" to={{ pathname: "/events", search: location.search }}>
        <svg viewBox="0 0 35 35" aria-hidden="true">
          <path d="M23.33 32.08 8.75 17.5 23.33 2.92l2.59 2.59L13.93 17.5l11.99 11.99-2.59 2.59Z" />
        </svg>
        マップに戻る
      </Link>
      <h2>{event.title}</h2>
      <p className="event-detail__meta">
        {formatTimeSlots(event.timeSlots)}
        <br />@{place?.name ?? event.placeId}
      </p>
      <div className="event-detail__tags">
        {tagLabels.map((label) => (
          <span className="event-card__tag" key={label}>
            <TagIcon />
            {label}
          </span>
        ))}
      </div>
      <p className="event-detail__description">{event.description}</p>
      <button className="event-detail__go" type="button" onClick={setDestination}>
        <svg viewBox="0 0 50 50" aria-hidden="true">
          <path d="M22.81 27.81 33.13 17.5l-2.97-2.97-7.34 7.34-2.92-2.92-2.97 2.97 5.89 5.89ZM25 40.31c4.24-3.89 7.38-7.42 9.43-10.6 2.05-3.18 3.07-6 3.07-8.46 0-3.79-1.2-6.88-3.62-9.3C31.47 9.54 28.5 8.33 25 8.33s-6.47 1.21-8.88 3.62c-2.41 2.42-3.62 5.51-3.62 9.3 0 2.46 1.02 5.28 3.07 8.46 2.05 3.18 5.19 6.71 9.43 10.6ZM25 45.83c-5.59-4.76-9.77-9.17-12.53-13.25-2.76-4.08-4.14-7.86-4.14-11.33 0-5.21 1.68-9.36 5.03-12.45C16.71 5.71 20.59 4.17 25 4.17s8.29 1.55 11.64 4.64c3.35 3.09 5.03 7.24 5.03 12.45 0 3.47-1.38 7.25-4.14 11.33-2.76 4.08-6.94 8.49-12.53 13.25Z" />
        </svg>
        ここへ行く
      </button>
    </div>
  );
}
