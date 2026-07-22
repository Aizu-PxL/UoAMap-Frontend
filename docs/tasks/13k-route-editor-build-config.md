# 13k — Route editor設定とinline buildを単一ソース化

## GOAL

route editorのmap/floor設定をTypeScriptの単一ソースへ移し、`places.ts` のplaces/mapSheets/floorsおよび `public/maps` の全10 SVGとの同期を自動検証する。Bun buildのIIFEをHTML markerへ埋め込むgenerate/check方式を追加し、チェックイン済み単一HTMLと `file://` 動作を維持する。

## 参照

- `docs/MAP_AUTHORING.md`
- `docs/ROUTE_EDITING_GUIDE.md`
- `.agent/refactor-plan.md` M7-1
- `src/data/places.ts`
- `tools/route-editor.html`

## やること

- editor map設定（sheetId/file/floor/group/name、floor order/name）をTS moduleへ移す。
- browser用entryで設定をglobal runtime configへ公開し、既存inline editorがそこから読む。
- `mapSheets`・`floors`・`places`・`public/maps/*.svg` と設定の同期テストを追加する。
- Bun buildのIIFEをHTML内の明示markerへ埋め込むgenerate/check scriptを追加する。
- `generate:route-editor` / `verify:route-editor` scriptsを追加し、通常buildの先頭でHTML鮮度を検証する。
- HTMLは引き続きscriptを内包する1ファイルとし、外部module読込を追加しない。

## SCOPE

- `tools/route-editor/config.ts`
- `tools/route-editor/config.test.ts`
- `tools/route-editor/configEntry.ts`
- `scripts/build-route-editor.ts`
- `tools/route-editor.html`
- `package.json`
- `.agent/refactor-plan.md`
- `docs/STATUS.md`
- `docs/HANDOFF.md`
- `docs/tasks/13k-route-editor-build-config.md`

editorの操作・入出力・履歴・Route XML、SVG、places/mapSheets/floorsの値、依存追加は対象外。

## 受入基準

- editor設定とmapSheets/floorsがsheet・floor・file・map名・順序で一致し、一覧用floor名はcanonicalなFloor名から既存の空白だけを除く短縮規則で導出される。
- 全Placeのfloorがeditor設定に存在し、`public/maps` の全10 SVGとfile一覧が完全一致する。
- HTMLから手書きMAPS/FLOOR_ORDER/FLOOR_NAMEを除去し、生成IIFEのruntime configだけを参照する。
- `generate:route-editor` がmarker間だけを更新し、`verify:route-editor` が古いHTMLをFAILさせる。
- buildが `verify:route-editor` とscripts/tools strict型検査を含む。
- `bun test`、`bun run verify:route-editor`、`bun run verify:routes`、`bun run verify:places`、`bun run build`、`git diff --check` がPASSする。
- Vite配信と `file://` の双方で単一HTMLを開き、全10 SVG読込、代表操作、console errorなしを確認する。
- 会話履歴を引き継がない読み取り専用レビューで指摘がない。

## DELIVERABLE

- route editor config単一ソースと同期テスト
- Bun IIFE generate/check scriptとHTML marker
- build鮮度検証
- 検証結果と独立レビュー結果

## 実施結果

- `tools/route-editor/config.ts` をmap/floor設定の単一ソースとし、生成IIFEのglobal runtime configを既存inline editorが参照する構成に変更した。
- mapSheets/floors/placesと `public/maps` の全10 SVG、canonical Floor名から既存短縮表示名への規則、HTML marker・外部script不在を4 tests / 11 assertionsで固定した。
- `generate:route-editor` と `verify:route-editor` を追加し、設定変更時にcheckが古いHTMLをFAILさせることも確認した。
- 全体ゲートは88 tests / 488 assertions、build、verify:places 36件、verify:routes 104 nodes / 112 edges、git diff --checkがPASSした。
- Vite配信でeditorの起動、代表モード切替、console error 0件を確認した。実行環境のBrowser security policyが `file://` を拒否し、ファイル入力APIも提供しないため、`file://` と全10 SVGのブラウザ自動取込は未実施。単一HTML、外部scriptなし、全10ファイル同期、生成物鮮度は自動検証で確認した。
- 初回独立レビューのP2（Floor短縮表示名とcanonical名の同期未検証）を、短縮規則の純粋関数化と全Floor assertionで修正した。全ゲート再実行後の再レビューで指摘なし。
