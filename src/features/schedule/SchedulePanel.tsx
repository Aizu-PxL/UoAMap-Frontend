import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const scheduleImageUrl = `${import.meta.env.BASE_URL ?? "/"}schedule/ocschedule2026.png`;

export function SchedulePanel() {
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (!isExpanded) {
      return;
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsExpanded(false);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isExpanded]);

  return (
    <div className="schedule-panel">
      <h2>タイムスケジュール</h2>
      <button
        className="schedule-panel__open"
        type="button"
        aria-label="タイムスケジュールを拡大表示"
        onClick={() => setIsExpanded(true)}
      >
        <img
          src={scheduleImageUrl}
          alt="オープンキャンパス2026 夏ステージ タイムスケジュール（8:30〜15:00）"
        />
      </button>
      {isExpanded
        ? createPortal(
            <div
              className="schedule-dialog"
              role="dialog"
              aria-modal="true"
              aria-label="拡大タイムスケジュール"
              onClick={(event) => {
                if (event.target === event.currentTarget) {
                  setIsExpanded(false);
                }
              }}
            >
              <div className="schedule-dialog__toolbar">
                <button
                  className="schedule-dialog__close"
                  type="button"
                  onClick={() => setIsExpanded(false)}
                >
                  閉じる
                </button>
              </div>
              <div
                className="schedule-dialog__viewport"
                onClick={(event) => {
                  if (event.target === event.currentTarget) {
                    setIsExpanded(false);
                  }
                }}
              >
                <img
                  src={scheduleImageUrl}
                  alt="オープンキャンパス2026 夏ステージ タイムスケジュール拡大画像"
                />
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
