# 23 BottomSheet外タップの最下部スナップ修正

## GOAL

地図背景をタップしたとき、指がBottomSheetの境界をまたいだ場合でも地図側が終了イベントを受け取り、BottomSheetが必ず最小の22svhへスナップする。

## 参照

- `docs/SPEC.md` §2、§3.1
- `docs/tasks/22-event-map-sheet-ux-fixes.md`
- `src/features/map/MapCanvas.tsx`

## やること

- 地図上で開始した全ポインターを地図キャンバスへ捕捉する。
- 同一ジェスチャーの先頭ポインターIDを保持し、既存の8pxタップ判定とパン・ピンチ処理を維持する。

## SCOPE

- `src/features/map/MapCanvas.tsx`
- `docs/tasks/23-bottom-sheet-outside-tap.md`
- `docs/STATUS.md`

## 受入基準

- BottomSheetが58／82svhのとき、地図背景タップで22svhへ到達する。
- 地図とBottomSheetの境界をまたいで指を離しても、地図背景タップの22svh要求が失われない。
- 8pxを超える移動は従来どおりパンとして扱い、ピンチ終了時に誤って22svhへスナップしない。
- `bun test`、`bun run build`、`bun run verify:places`、`bun run verify:routes`、`bun run verify:all`、`git diff --check` がPASSする。
- 会話履歴を引き継がない読み取り専用レビューで指摘がない、または指摘を修正・再検証・再レビューで解消する。

## DELIVERABLE

- `MapCanvas`のポインター捕捉を修正し、既存の地図ジェスチャー境界を維持する。
- `bun run verify:all`（125 tests / 1,015 assertions、production build、123 Place / 88 QR / 61 Event、348 nodes / 445 edges、git diff check）をPASSした。
- 初回独立レビューのP2（追加ポインターによるジェスチャー状態の上書き）を修正し、別コンテキストの再レビューで指摘なしを確認した。結果を`docs/STATUS.md`へ追記した。
