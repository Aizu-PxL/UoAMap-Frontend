# 26 BottomSheetナビゲーションアイコンのサイズ統一

## GOAL

BottomSheet上部のリストとスケジュールのアイコンを同じ表示サイズに揃え、スケジュールには指定されたcalendar_monthアイコンを使用する。既存のタブ遷移・色・QRアイコンは変更しない。

## 参照

- `docs/SPEC.md` §3.6、§5.4
- `docs/WORKFLOW.md`
- `src/components/bottom-sheet/SheetNavigation.tsx`
- `src/styles/global.css`
- 添付: `C:\Users\moton\Downloads\calendar_month_24dp_1F1F1F_FILL0_wght400_GRAD0_opsz24.svg`

## やること

- スケジュールアイコンを添付SVGのパスへ差し替える。
- リストと同じ24×24座標系・共通`.sheet-icon`サイズで描画する。
- タブ遷移、アクティブ状態の色、QRアイコンの表示は維持する。

## SCOPE

- `docs/tasks/26-bottom-sheet-nav-icon-size.md`
- `docs/STATUS.md`
- `src/components/bottom-sheet/SheetNavigation.tsx`

CSS、ルーティング、データ、SVG地図、仕様書は変更しない。

## 受入基準

- `bun test` がPASSする。
- `bun run build` がPASSする。
- `bun run verify:places` が123 Place / 88 QR / 61 EventでPASSする。
- `git diff --check` がPASSする。
- 幅402pxの`/events`と`/schedule`で、リスト／スケジュールのアイコン外枠サイズが共通で、スケジュールに添付パスのカレンダー形状が表示される。
- 会話履歴なしの読み取り専用レビューで指摘なし、または指摘を修正・再検証・再レビューで解消する。

## DELIVERABLE

変更ファイル、検証結果、ブラウザ確認結果、独立レビュー結果を`docs/STATUS.md`へ追記する。git操作は行わない。
