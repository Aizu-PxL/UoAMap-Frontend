# 22 イベント表示・地図／BottomSheet UX修正

## GOAL

イベント一覧・詳細で正式IDを確認でき、数字検索でIDを優先できるようにする。カードの余分な伸長と影をなくし、BottomSheetが重なる地図は上側の表示領域を中心に見せる。地図背景タップ、パン操作、QR案内文言の不具合も修正する。

## 参照

- `docs/SPEC.md` §2、§3.1、§3.4、§3.5
- `docs/WORKFLOW.md`
- `docs/FIGMA.md`
- `src/features/events/`
- `src/features/map/MapCanvas.tsx`
- `src/styles/global.css`

## やること

- `Event.id` がある場合だけ、カードと詳細に `ID: <id>` を表示する。`service-*` 内部keyは表示しない。
- 検索語の半角・全角数字を正規化し、数字を含む検索では正式ID部分一致を優先する。ID一致がなければ既存の全文検索へフォールバックする。
- イベントリストのauto track伸長とカードのdrop shadowをなくす。
- 地図の表示レイヤーをBottomSheet高さの半分だけ上へ移動し、シートを除いた上側を視覚中心にする。表示切替UIは既存どおりシート上端へ追従する。
- MapCanvasのpointer captureとtouch/pointer終了処理を整理し、地図背景タップの22svh要求と境界をまたぐパンを安定させる。
- QR案内文言の句点を削除する。

## SCOPE

- `docs/SPEC.md`
- `docs/STATUS.md`
- `docs/tasks/22-event-map-sheet-ux-fixes.md`
- `src/features/events/eventSearch.ts`
- `src/features/events/eventSearch.test.ts`
- `src/features/events/EventCard.tsx`
- `src/features/events/EventDetail.tsx`
- `src/features/map/MapCanvas.tsx`
- `src/features/qr/QrPanel.tsx`
- `src/styles/global.css`

Figmaは既存の`EventCard`とScreens 03/05の表示だけを同期し、ノード構造・トークン・API・Repository・Eventデータ・SVG・Routeグラフは変更しない。

## 受入基準

- 正式IDありのカード／詳細に`ID: P1`が表示され、正式IDなしの運営イベントに内部keyが表示されない。
- 数字検索はID一致を優先し、ID未一致時はタイトル・説明・会場名の全文検索へ戻る。全角数字も同じ結果になる。
- 1件・少数件のカードが自然な内容高になり、カード本体・強調状態にdrop shadowがない。
- 402px幅で22／58／82svhの地図表示中心、地図背景タップによる22svh、境界をまたぐパンを確認する。
- QR案内文言に句点がない。
- `bun test`、`bun run build`、`bun run verify:places`、`bun run verify:routes`、`bun run verify:all`、`git diff --check`がPASSする。
- 会話履歴なしの読み取り専用レビューで指摘なし、または指摘を1回の修正・再検証・再レビューで解消する。

## DELIVERABLE

変更ファイル、Figma同期結果、単体・全体検証結果、402pxブラウザ確認、独立レビュー結果を`docs/STATUS.md`へ追記する。git履歴は変更しない。
