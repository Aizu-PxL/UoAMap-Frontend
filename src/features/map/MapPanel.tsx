import { useNavState } from "../../app/useNavState";

export function MapPanel() {
  const {
    currentPlace,
    destinationEvent,
    destinationPlace,
    focusPlace,
    loading,
    error,
  } = useNavState();

  return (
    <div className="map-panel">
      <h2>地図</h2>
      <dl className="nav-status">
        <div className="nav-status__row">
          <dt>現在地</dt>
          <dd>{currentPlace ? currentPlace.name : "未設定(会場のQRを読み取ってください)"}</dd>
        </div>
        <div className="nav-status__row">
          <dt>目的地</dt>
          <dd>
            {loading
              ? "読み込み中…"
              : destinationEvent
                ? `${destinationEvent.title}(${destinationPlace?.name ?? "会場不明"})`
                : "未設定(イベントを選んでください)"}
          </dd>
        </div>
        <div className="nav-status__row">
          <dt>注目地点</dt>
          <dd>{focusPlace ? focusPlace.name : "未設定"}</dd>
        </div>
      </dl>
      {error && (
        <p className="status-error" role="alert">
          {error}
        </p>
      )}
      {/* 地図フォーカス・ルート表示はステップ2以降(SPEC.md 6章) */}
      <p>地図表示は準備中です。</p>
    </div>
  );
}
