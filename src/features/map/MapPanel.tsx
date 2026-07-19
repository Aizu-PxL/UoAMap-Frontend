import { useLocation, useNavigate, useSearchParams } from "react-router";
import { useNavState } from "../../app/useNavState";

export function MapPanel() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const {
    currentPlace,
    destinationEvent,
    destinationPlace,
    focusPlace,
    loading,
    error,
  } = useNavState();

  const focusOn = (placeId: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("focus", placeId);
    const previousNonce =
      typeof location.state?.mapFocusRequestNonce === "number"
        ? location.state.mapFocusRequestNonce
        : 0;
    navigate(
      { pathname: "/", search: params.toString() },
      { state: { mapFocusRequestNonce: previousNonce + 1 } },
    );
  };

  const placeLabel = (place: typeof currentPlace) => {
    if (!place) {
      return null;
    }
    return place.mapping === "unmapped"
      ? `${place.name}（位置情報なし）`
      : place.name;
  };

  return (
    <div className="map-panel">
      <h2>地図</h2>
      <dl className="nav-status">
        <div className="nav-status__row">
          <dt>現在地</dt>
          <dd>{placeLabel(currentPlace) ?? "未設定(会場のQRを読み取ってください)"}</dd>
        </div>
        <div className="nav-status__row">
          <dt>目的地</dt>
          <dd>
            {loading
              ? "読み込み中…"
              : destinationEvent
                ? `${destinationEvent.title}(${placeLabel(destinationPlace) ?? "会場不明"})`
                : "未設定(イベントを選んでください)"}
          </dd>
        </div>
        <div className="nav-status__row">
          <dt>注目地点</dt>
          <dd>{placeLabel(focusPlace) ?? "未設定"}</dd>
        </div>
      </dl>
      {(currentPlace || destinationPlace) && (
        <div className="map-panel__focus-actions">
          {currentPlace && (
            <button type="button" onClick={() => focusOn(currentPlace.id)}>
              現在地へ
            </button>
          )}
          {destinationPlace && (
            <button type="button" onClick={() => focusOn(destinationPlace.id)}>
              目的地へ
            </button>
          )}
        </div>
      )}
      {error && (
        <p className="status-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
