# 13n — Route editor Route XML生成・置換の純粋化

## GOAL

route editorのRoute group XML生成、既存Route置換、Route未存在時のappendを副作用のないTypeScript coreへ移す。属性順、escape、座標丸め、node/edge挿入順、indent、改行をexact-string characterization testで固定し、SVG出力を完全に維持する。

## 参照

- `docs/MAP_AUTHORING.md`
- `docs/ROUTE_EDITING_GUIDE.md`
- `.agent/refactor-plan.md` M7
- `docs/tasks/13m-route-editor-history.md`
- `tools/route-editor.html`

## やること

- Route node/edge入力からRoute group文字列を作るpure関数を追加する。
- XML attribute escape、座標小数3桁丸め、optional属性、missing endpointの空`d`を現行順序のまま固定する。
- 既存 `id="Route"` groupの置換と、未存在SVGの `</svg>` 直前appendをpure関数へ移す。
- inline editorはMapStateから配列inputを作り、Blob/downloadを行うDOM境界だけを担う。
- partial-loadを許すeditor簡易検証と、全10 SVGを前提とする正式抽出器は共通化しない。

## SCOPE

- `tools/route-editor/routeXml.ts`
- `tools/route-editor/routeXml.test.ts`
- `tools/route-editor/configEntry.ts`
- `tools/route-editor.html`
- `.agent/refactor-plan.md`
- `docs/STATUS.md`
- `docs/HANDOFF.md`
- `docs/tasks/13n-route-editor-route-xml.md`

SVG parser/validator、Route抽出core、history、plan I/O、画面UI、SVG本体、依存追加は対象外。

## 受入基準

- Route groupのgroup/node/edge属性順、optional属性条件、node→edgeの挿入順を維持する。
- `& < > "` のescapeと座標小数3桁丸めを維持する。
- edgeの両endpointが存在する場合だけ既存形式の`d`を作り、不明endpointは空文字を維持する。
- `routeIndent` fallback、group/child indent、改行をexact stringで固定する。
- 既存Route groupだけを置換し、Route未存在時は`</svg>`直前へappendして末尾改行を付ける。
- HTML内の手書きXML生成・置換処理を除去し、generated IIFE coreだけを参照する。
- `bun test`、`bun run verify:route-editor`、`bun run verify:routes`、`bun run verify:places`、`bun run build`、`git diff --check` がPASSする。
- Vite配信で全10 SVG読込、代表SVG download操作、console errorなしを確認する。
- 会話履歴を引き継がない読み取り専用レビューで指摘がない。

## DELIVERABLE

- pure Route XML coreとexact-string tests
- generated IIFE globalとinline editor接続
- 検証結果と独立レビュー結果

## 実施結果

- Route group生成、escape、座標format、既存Route置換、未存在時appendを `tools/route-editor/routeXml.ts` へ抽出し、generated IIFE globalからinline editorへ接続した。
- group/node/edge属性順、truthy optional属性、node→edge挿入順、`& < > "` escape、小数3桁丸め、unknown endpointの空`d`、undefined/null/空indent fallback・改行、既存置換、appendを5 tests / 15 assertionsのexact stringで固定した。
- 全体ゲートは105 tests / 551 assertions、`verify:route-editor`、build、verify:places 36件、verify:routes 104 nodes / 112 edges、git diff --checkがPASSした。
- Vite配信で全10 SVGを読み込み、キャンパスSVGのdownload操作と未保存0件維持、console error 0件を確認した。`file://` はBrowser security policyにより自動確認していない。
- 初回独立レビューのP3（indent fallbackと空optional属性のtest不足）を、undefined/null/空文字の3種fallback exact assertionで修正した。全ゲート再実行後の再レビューで指摘なし。
