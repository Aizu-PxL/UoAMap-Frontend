# 13m — Route editor Undo / Redo履歴の純粋state machine化

## GOAL

route editorのUndo / Redoスタック操作を副作用のないTypeScript state machineへ移す。no-op非記録、100件上限、redo破棄、snapshot復元、SVG再読込reset、計画JSON読込1操作、`nextQrNumber`非巻戻しをcharacterization testで固定し、dragと連続入力を各1操作のまま維持する。

## 参照

- `.agent/refactor-plan.md` M7
- `docs/ROUTE_EDITING_GUIDE.md`
- `docs/tasks/13l-route-editor-plan-io.md`
- `tools/route-editor.html`

## やること

- history state作成、record、undo、redo、resetをimmutableなpure関数へ移す。
- editable snapshot比較はmaps/qrPlacements/placeProposalsだけを対象にし、selection/current sheetと`nextQrNumber`を履歴判定・復元対象に増やさない。
- inline editorはsnapshot採取、DOM更新、snapshot復元、drag/continuous-input境界だけを担う。
- SVGの再読込ごとの履歴reset、計画JSON読込の`runEdit` 1回、drag終了時とcontinuous input終了時のcommit 1回を維持する。

## SCOPE

- `tools/route-editor/history.ts`
- `tools/route-editor/history.test.ts`
- `tools/route-editor/configEntry.ts`
- `tools/route-editor.html`
- `.agent/refactor-plan.md`
- `docs/STATUS.md`
- `docs/HANDOFF.md`
- `docs/tasks/13m-route-editor-history.md`

計画I/O変換、Route XML、SVG parser/validator、画面UI、履歴対象の追加、依存追加は対象外。

## 受入基準

- editable snapshotが同じ操作は記録せず、異なる操作だけundoへ積む。
- undoはbeforeを復元してentryをredoへ移し、redoはafterを復元してundoへ戻す。
- undo後の新規recordはredoを破棄する。
- undoは最新100件だけを保持し、resetはundo/redoを空にする。
- selection/current sheetだけの差はno-opとし、`nextQrNumber`はsnapshot比較・復元対象外のまま維持する。
- 計画JSON読込は複数配置・Place案の置換を1 entryとして記録する。
- dragとcontinuous inputはpointer/inputイベントごとでなく終了時に各1 entryだけ記録する。
- SVG読込時に履歴をresetする既存境界を維持する。
- `bun test`、`bun run verify:route-editor`、`bun run verify:routes`、`bun run verify:places`、`bun run build`、`git diff --check` がPASSする。
- Vite配信でUndo/Redoボタン、代表編集、console errorなしを確認する。
- 会話履歴を引き継がない読み取り専用レビューで指摘がない。

## DELIVERABLE

- pure history state machineとcharacterization tests
- generated IIFE globalとinline editor接続
- 検証結果と独立レビュー結果

## 実施結果

- history state作成・record・undo・redo・resetとeditable snapshot比較を `tools/route-editor/history.ts` のimmutable pure state machineへ抽出し、generated IIFE globalからinline editorへ接続した。
- no-op非記録、before/after復元、redo破棄、正の整数上限・最新100件、reset、selection/current sheet無視、計画JSON読込1操作、nextQrNumber非巻戻し、SVG読込reset・drag・continuous inputの各1 commitを6 tests / 28 assertionsで固定した。
- 全体ゲートは100 tests / 536 assertions、`verify:route-editor`、build、verify:places 36件、verify:routes 104 nodes / 112 edges、git diff --checkがPASSした。
- Vite配信で全10 SVGを読込み、QR候補追加→Undo→Redo→Undoを確認した。Undo後の再追加はQ001を再利用せずQ002となり、連番非巻戻しを実DOMでも確認。console error 0件。
- 初回独立レビューのP3（limit=0で履歴上限を守れない不整合）を、正の整数制約とlimit=0/1境界testで修正した。全ゲート再実行後の再レビューで指摘なし。
