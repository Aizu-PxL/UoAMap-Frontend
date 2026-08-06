# 25 BottomSheet追従型の地図操作UI整理

## GOAL

フロア切替と「キャンパス全体へ戻る」をBottomSheetの上端フローティング領域へ移し、22／58／82svhの高さ変更や端末viewport差があってもシートに隠れない状態にする。見た目、操作、URL・SVG・Route契約は維持する。

## 参照

- `docs/SPEC.md` §2、§3.1
- `docs/WORKFLOW.md`
- `docs/FIGMA.md`
- `src/features/map/MapCanvas.tsx`
- `src/components/bottom-sheet/BottomSheet.tsx`
- `src/app/AppLayout.tsx`
- `src/styles/global.css`

## やること

- フロアグループと表示ラベルを共有純粋モジュールへ切り出す。
- フロア切替とキャンパス復帰を`MapSheetControls`へ抽出する。
- `BottomSheet`へ`topOverlay`スロットを追加し、シート上端を基準に操作群を配置する。
- BottomSheetの外枠と表示面を分離し、外枠は上端オーバーレイを表示でき、表示面は従来どおり本文をクリップする。
- MapCanvasの旧`bottom: calc(var(--bottom-sheet-height) + 1rem)`依存を削除する。
- 640px以下の短いviewportでは操作群をコンパクト化し、画面上端からのクリップを防ぐ。

## SCOPE

- `docs/tasks/25-map-sheet-controls.md`
- `docs/STATUS.md`
- `src/app/AppLayout.tsx`
- `src/components/bottom-sheet/BottomSheet.tsx`
- `src/features/map/MapCanvas.tsx`
- `src/features/map/mapFloorNavigation.ts`
- `src/features/map/mapFloorNavigation.test.ts`
- `src/features/map/MapSheetControls.tsx`
- `src/styles/global.css`

Figma、SPEC、SVG、Routeグラフ、Repository、URL契約は変更しない。

## 受入基準

- フロア選択ロジックの単体テストが通る。
- `bun test`、`bun run build`、`bun run verify:places`、`bun run verify:routes`、`bun run verify:all`、`git diff --check`がPASSする。
- `/?at=lh_room_lth_1`を320×568、375×667、402×874pxで確認する。
- BottomSheetの22／58／82svhすべてで、操作群がシート上端から一定間隔で追従し、シート背面に入らない。
- フロア切替・キャンパス復帰で地図パンやBottomSheetスナップが誤発火しない。
- 既存の地図境界越しパンとconsole error 0件を確認する。
- 会話履歴なしの読み取り専用レビューで指摘なし、または指摘を修正・再検証・再レビューで解消する。

## DELIVERABLE

変更ファイル、全検証結果、ブラウザ確認結果、独立レビュー結果を`docs/STATUS.md`へ追記する。git操作は行わない。
