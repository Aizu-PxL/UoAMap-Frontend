export function MapPanel() {
  return (
    <div className="map-panel">
      <h2>地図</h2>
      <p>地図に関するUIをここに追加できます。</p>
      <div className="map-panel__actions">
        <button type="button">現在地</button>
        <button type="button">フロア</button>
        <button type="button">凡例</button>
      </div>
    </div>
  );
}
