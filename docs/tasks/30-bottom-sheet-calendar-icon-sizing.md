# 30 BottomSheetカレンダーアイコンのサイズ調整

## GOAL

添付SVGを使用しているスケジュールアイコンが、リストアイコンより大きく見える差を解消する。添付SVGの形状・タブ操作・色は維持し、カレンダーだけを比率を崩さず少し縮小して、視覚的な最大寸法をリストに合わせる。

## 参照

- `docs/SPEC.md` §3.6、§5.4
- `docs/WORKFLOW.md`
- `src/components/bottom-sheet/SheetNavigation.tsx`
- `src/styles/global.css`
- 添付: `C:\Users\moton\Downloads\calendar_month_24dp_1F1F1F_FILL0_wght400_GRAD0_opsz24.svg`

## やること

- スケジュールSVGへカレンダー専用クラスを付ける。
- カレンダーだけを`scale(0.9)`で縮小し、リストの最大表示寸法に合わせる。
- 添付SVGの`viewBox`・`path`、タブ遷移、アクティブ状態の色、QRアイコンは変更しない。

## SCOPE

- `docs/tasks/30-bottom-sheet-calendar-icon-sizing.md`
- `docs/STATUS.md`
- `src/components/bottom-sheet/SheetNavigation.tsx`
- `src/styles/global.css`

既存のデータ、ルーティング、SVG地図、API契約は変更しない。

## 受入基準

- `bun test` がPASSする。
- `bun run build` がPASSする。
- `bun run verify:places` が124 Place / 89 QR / 61 EventでPASSする。
- `git diff --check` がPASSする。
- 幅402pxで`/events`と`/schedule`を確認し、リスト／カレンダーの最大表示寸法が揃い、添付SVG形状とconsole error 0件を確認する。
- 独立読み取り専用レビューで指摘なし、または指摘を修正・再検証・再レビューで解消する。

## DELIVERABLE

変更ファイル、検証結果、ブラウザ確認結果、独立レビュー結果を`docs/STATUS.md`へ追記する。git操作は行わない。
