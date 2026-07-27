const scheduleImageUrl = `${import.meta.env.BASE_URL ?? "/"}schedule/ocschedule2026.png`;

export function SchedulePanel() {
  return (
    <div className="schedule-panel">
      <h2>タイムスケジュール</h2>
      <img
        src={scheduleImageUrl}
        alt="オープンキャンパス2026 夏ステージ タイムスケジュール（8:30〜15:00）"
      />
    </div>
  );
}
