export function QrPanel() {
  return (
    <div className="qr-panel">
      <p className="qr-panel__copy">
        道案内QRコードを読み込んでください。
        <br />
        指定した場所へのルートが表示されます。
      </p>
      {/* アプリ内スキャンはステップ5で実装(SPEC.md 6章) */}
      <div className="qr-panel__camera" aria-label="QR scanner preview" />
    </div>
  );
}
