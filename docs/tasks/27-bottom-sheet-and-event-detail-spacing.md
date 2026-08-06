# 27 BottomSheetタブとイベント詳細の余白調整

## GOAL

BottomSheet上部タブの上下余白を現状の半分にし、イベント詳細のID下の余白をイベントカードと同じ間隔へ揃える。タブ操作、詳細表示内容、ルーティングは変更しない。

## 参照

- `docs/SPEC.md` §3.4、§3.5
- `docs/WORKFLOW.md`
- `src/styles/global.css`
- `src/features/events/EventDetail.tsx`

## やること

- `.sheet-nav` の上下marginを `0.7rem / 1.4rem` から半分へ変更する。
- `.event-detail__id` の下marginをイベントカードIDと同じ `0.25rem` へ変更する。
- `.event-detail__meta` の既定段落上marginをリセットし、ID下の間隔を確実に揃える。

## SCOPE

- `docs/tasks/27-bottom-sheet-and-event-detail-spacing.md`
- `docs/STATUS.md`
- `src/styles/global.css`

React、ルーティング、データ、SVG、API契約は変更しない。独立サブエージェントレビューは実施せず、ユーザー確認と自動検証で完了とする。

## 受入基準

- `bun test` がPASSする。
- `bun run build` がPASSする。
- `bun run verify:places` が123 Place / 88 QR / 61 EventでPASSする。
- `git diff --check` がPASSする。
- 幅402pxで`/events`、`/events/A1`、`/schedule`を確認し、タブ上下余白が半分、詳細ID下余白がカード相当、console error 0件である。

## DELIVERABLE

変更ファイル、検証結果、ブラウザ確認結果を`docs/STATUS.md`へ追記する。git操作は行わない。
