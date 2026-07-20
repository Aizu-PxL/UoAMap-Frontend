# BACKLOG — 未実装の要望・検討事項

最終更新: 2026-07-21(ステップ5アプリ内QRスキャンの完了を反映)
**位置づけ**: SPEC.mdに昇格する前の要望・検討の置き場。着手するときは、仕様が確定するものから先に [SPEC.md](SPEC.md) を更新し、ブリーフ(docs/tasks/)に落としてから実装する([WORKFLOW.md](WORKFLOW.md) 参照)。項目を消化したらこのファイルから削除し、STATUS.mdへ反映する。

## 検討事項

### 建物枠線(クリック可能アフォーダンス)の見た目調整

現状はアクセント色 2px・透明度0.38の枠線。見た目は要調整とのフィードバックあり(2026-07-20)。調整箇所:

- **色・太さ・透明度**: `src/styles/global.css` の `.map-canvas__interactive-building`(通常時)と `.map-canvas__interactive-building:focus-visible`(フォーカス時)。ファイル内に【調整ポイント】コメントあり
- **どの建物に付くか**: `src/features/map/MapCanvas.tsx` の `buildingFloorIds` 定数(この5建物に付与)と、campusシート読み込みuseEffect内の `map-canvas__interactive-building` クラス付与ループ

### 目的地設定〜ナビ開始フローの再検討(未確定)

「地図」パネル(`/` のときシートに出る現在地/目的地ステータス画面)はFigmaに存在せず、あまり良くない。フロー全体を再検討予定で、**変更になる可能性が高い**。

- 現状の事実: このパネルは `src/features/map/MapPanel.tsx` 単体で、地図・フォーカス・マーカーのロジックは背面(MapCanvas/AppLayout/URL)にある。**パネルの差し替え・削除は地図機能に影響しない**
- Figma Screen/01 の挙動(シート最小化で地図を見せる)への変更も、パネル1ファイル+シート初期高さの変更で済む
- ユーザーがフローを決めたら: SPEC §3.2/§2 を更新 → Figmaに画面を起こす → ブリーフ化

## ロードマップ残(SPEC §6より)

- **ステップ7**: API接続(契約: docs/API.md、リポジトリ層差し替えのみで完結させる)

## その他未決事項

SPEC §7 も参照(QR設置一覧とqrId採番、ホスティング先、バックエンド技術選定など)。
