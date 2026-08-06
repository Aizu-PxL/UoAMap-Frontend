import {
  DEFAULT_FLOOR_ID,
  getFloorLabel,
  getSelectableFloorIds,
} from "./mapFloorNavigation";

type MapSheetControlsProps = {
  floorId: string;
  onFloorChange: (floorId: string) => void;
};

export function MapSheetControls({ floorId, onFloorChange }: MapSheetControlsProps) {
  const selectableFloorIds = getSelectableFloorIds(floorId);

  if (floorId === DEFAULT_FLOOR_ID) {
    return null;
  }

  return (
    <div
      className="map-sheet-controls"
      aria-label="地図表示切替"
      onPointerDown={(event) => event.stopPropagation()}
    >
      {selectableFloorIds && (
        <div className="map-sheet-controls__floor-switch" aria-label="フロア切替">
          {selectableFloorIds.map((selectableFloorId) => {
            const floorLabel = getFloorLabel(selectableFloorId);
            return (
              <button
                key={selectableFloorId}
                type="button"
                className="map-sheet-controls__floor-button"
                aria-label={floorLabel}
                aria-pressed={selectableFloorId === floorId}
                onClick={() => onFloorChange(selectableFloorId)}
              >
                {floorLabel}
              </button>
            );
          })}
        </div>
      )}
      <button
        type="button"
        className="map-sheet-controls__campus-button"
        aria-label="キャンパス全体へ戻る"
        onClick={() => onFloorChange(DEFAULT_FLOOR_ID)}
      >
        キャンパス全体へ戻る
      </button>
    </div>
  );
}
