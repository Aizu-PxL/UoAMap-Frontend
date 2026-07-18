import { useEffect } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { useCampusData } from "../../data/DataProvider";
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
        ← 検索へ戻る
      </Link>
      <h2>{event.title}</h2>
      <p className="event-detail__meta">
        {formatTimeSlots(event.timeSlots)}
        <br />@{place?.name ?? event.placeId}
      </p>
      <div className="event-detail__tags">
        {tagLabels.map((label) => (
          <span className="event-card__tag" key={label}>
            {label}
          </span>
        ))}
      </div>
      <p className="event-detail__description">{event.description}</p>
      <button className="event-detail__go" type="button" onClick={setDestination}>
        ここへ行く
      </button>
    </div>
  );
}
