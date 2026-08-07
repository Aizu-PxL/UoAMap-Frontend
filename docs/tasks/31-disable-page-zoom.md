# 31 — サイト全体のページズーム抑止

## GOAL

スマホでUoAMapを表示したとき、ブラウザのページ全体は拡大できない状態にしつつ、スケジュール画像だけは専用操作で拡大縮小できる状態にする。

## 参照

- `docs/SPEC.md` §1、§3.6
- `docs/WORKFLOW.md`
- `index.html`
- `src/styles/global.css`

## やること

- アプリ本体のviewport metaへページズーム抑止を設定する。
- 地図、BottomSheet、スケジュール画像の表示・スクロール・閉じる操作は維持する。
- スケジュール画像へ縮小・拡大ボタン、倍率表示、2本指ピンチを追加する。
- スケジュール画像の専用ズームはページ全体のviewportズームと分離する。

## SCOPE

- `index.html`
- `docs/SPEC.md`
- `docs/tasks/31-disable-page-zoom.md`
- `docs/STATUS.md`
- `src/styles/global.css`
- `src/features/schedule/SchedulePanel.tsx`
- `src/features/schedule/scheduleZoom.ts`
- `src/features/schedule/scheduleZoom.test.ts`

## 受入基準

- `index.html` のviewportに `maximum-scale=1.0` と `user-scalable=no` が設定されている。
- スケジュール画像を含むアプリ本体で、ページ全体の拡大操作が抑止される。
- スケジュール画像に縮小・拡大操作と倍率表示があり、専用viewportの `touch-action` が `none` である。
- 専用ズームは最小0.75倍〜最大3倍でclampされる。
- `bun run build`、`bun run verify:places`、`git diff --check` がPASSする。

## DELIVERABLE

- viewport metaへページ全体のズーム抑止を追加した。
- スケジュール画像の専用ズームUI、2本指ピンチ、1本指ドラッグスクロールを追加した。ページ全体のviewportズーム抑止は維持している。
- `bun test` PASS（137 tests / 1,052 assertions）。
- `bun run build` PASS（Route editor鮮度検証、型検査、Vite build）。
- `bun run verify:places` PASS（124 Place / 89 QR / 61 Event）。
- `git diff --check` PASS。
- 402×874pxのローカルブラウザでviewport metaが期待値と一致し、スケジュール画面、縮小・拡大ボタン、倍率表示を確認し、console error 0件。スケジュールviewportの `computed touchAction = none` を確認した。実機の2本指ピンチは未確認。
- 会話履歴なしの読み取り専用独立レビューは指摘なし。
