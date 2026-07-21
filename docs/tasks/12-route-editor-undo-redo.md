# 12 ルートエディタ Undo / Redo

## GOAL

ルートノード作図ツールの全編集操作を、ボタンと標準ショートカットから安全に元へ戻し、やり直せるようにする。ノードの連鎖削除、複数マップにまたがる生成、QR候補とPlace案の連動を1つの論理操作として扱い、SVGダウンロード後も未保存表示を正しく保つ。

## 参照

- [SPEC.md](../SPEC.md) §3.2
- [MAP_AUTHORING.md](../MAP_AUTHORING.md)
- [11-qr-placement-planner.md](11-qr-placement-planner.md)
- `tools/route-editor.html`

## やること

1. 編集状態のbefore / afterスナップショットを最大100操作保持し、Undo / Redoと新規編集時のRedo破棄を実装する
2. ノード・エッジ・入口・階段・Route floor・QR候補・Place案・計画JSON読込を論理操作単位で履歴化する
3. ドラッグと連続入力を各1操作にまとめ、自動採番の上限は履歴復元で巻き戻さない
4. ツールバーのボタン、`Ctrl/Cmd + Z`、`Ctrl/Cmd + Shift + Z`、`Ctrl + Y`、入力欄内のネイティブ文字Undoを両立する
5. SVG読込時に履歴を初期化し、保存済みRoute状態との比較から未保存表示を再計算する

## SCOPE

- `docs/SPEC.md`
- `docs/MAP_AUTHORING.md`
- `docs/STATUS.md`
- `docs/tasks/12-route-editor-undo-redo.md`
- `tools/route-editor.html`

## 受入基準

- [x] 全編集操作をUndo / Redoでき、無効時はボタンがdisabledになる
- [x] ノードドラッグと連続入力はそれぞれ1回のUndoで戻る
- [x] ノード削除の接続エッジ、入口・階段の別マップ生成、QR・Place連動が一括復元される
- [x] Undo後の新規編集でRedo履歴が破棄され、自動採番済み番号は再利用されない
- [x] SVGダウンロード前後のUndo / Redoで未保存表示が正しく、SVG読込時に履歴が初期化される
- [x] 計画JSONのスキーマとバックエンド向け出力形式を変更しない
- [x] `bun test`、`bun run build`、`bun run verify:places`、`bun run verify:routes`、`git diff --check`がPASSする

## DELIVERABLE

変更ファイルは本ブリーフのSCOPE内のみ。編集状態のbefore / afterスナップショットと保存済みRoute署名を導入し、自動採番カウンターを履歴対象外にして番号の再利用を防いだ。

ブラウザでは、QR追加とUndo / Redo、Undo後のQ番号非再利用、設置メモの1操作Undo、ノードドラッグ、接続エッジ2本を含むノード削除復元、SVGダウンロード前後の未保存判定、キーボードショートカット、SVG再読込による履歴初期化、計画JSON読込のUndo、コンソールエラーなしを確認した。検証結果は`bun test` 39件PASS、`bun run build` PASS、`bun run verify:places` 36件PASS、`bun run verify:routes` 104ノード／112エッジ、`git diff --check` PASS。
