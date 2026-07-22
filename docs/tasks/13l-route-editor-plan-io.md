# 13l — Route editor計画・QR・CSV・Place案入出力の純粋化

## GOAL

route editorのschema v1計画JSON、バックエンド向けQrCode JSON、CSV、座標Place案JSONの変換・検証を副作用のないTypeScript coreへ移す。既存の文字列、並び順、trim、重複エラー、次回QR番号、情報用座標の扱いをexact characterization testで固定し、単一HTMLと既存操作を維持する。

## 参照

- `docs/SPEC.md` §4.3
- `docs/MAP_AUTHORING.md` 「QR設置計画」
- `docs/ROUTE_EDITING_GUIDE.md`
- `.agent/refactor-plan.md` M7
- `docs/tasks/13k-route-editor-build-config.md`
- `tools/route-editor.html`

## やること

- QR ID数値部・QR順、座標丸め、schema v1計画データ構築をpure coreへ移す。
- 計画JSON読込のschema/配列/重複検証と文字列正規化、`nextQrNumber` 算出をpure coreへ移す。
- QrCode JSON、BOM付きCRLF CSV、Place案JSONの構築・文字列化をpure coreへ移す。
- 計画JSON内のfloor/x/yは情報用として書き出すが、読込時は現在のSVGノードを正として無視する現行挙動を固定する。
- coreを13kのgenerated IIFE globalへ公開し、inline editorはstate/DOM/download/historyとの接続だけを担う。

## SCOPE

- `tools/route-editor/planIo.ts`
- `tools/route-editor/planIo.test.ts`
- `tools/route-editor/configEntry.ts`
- `tools/route-editor.html`
- `.agent/refactor-plan.md`
- `docs/STATUS.md`
- `docs/HANDOFF.md`
- `docs/tasks/13l-route-editor-plan-io.md`

履歴state machine、Route XML、SVG読込・検証、QR候補の画面操作、Repository/API契約、依存追加は対象外。

## 受入基準

- QRは数値部の昇順、同数値なら文字列順となり、不正形式は既存どおり数値部 `-1` として扱う。
- schema v1計画JSONはplacement/proposalを所定順で出力し、末尾改行、2-space indent、情報用floor/x/y、座標小数2桁丸めを維持する。
- 読込はschema/配列不正、QR ID重複、Place案ID重複を既存文言で拒否し、文字列化、trimしない値、情報用座標無視、最大QR IDと保存値からの`nextQrNumber`を維持する。
- QrCode JSONは4フィールドだけを含み、installationNoteだけをtrimする。
- CSVはUTF-8 BOM、CRLF、末尾CRLF、comma/quote/改行のquoteとquote二重化を維持する。
- Place案はID順、解決できないノードを除外し、floorIdと現在ノード座標を使う。
- `bun test`、`bun run verify:route-editor`、`bun run verify:routes`、`bun run verify:places`、`bun run build`、`git diff --check` がPASSする。
- Vite配信で計画保存・代表出力・読込後の表示が現行どおりで、console errorがない。
- 会話履歴を引き継がない読み取り専用レビューで指摘がない。

## DELIVERABLE

- pure plan I/O coreとexact tests
- generated IIFE globalとinline editor接続
- 検証結果と独立レビュー結果

## 実施結果

- schema v1計画データ、QrCode mapping、CSV、座標Place案、計画parseを `tools/route-editor/planIo.ts` へ抽出し、13kのgenerated IIFE globalからinline editorへ接続した。
- QR順、JSON field順・2-space indent・末尾改行、情報用floor/x/yと小数2桁丸め、読込時文字列化・情報座標無視・重複文言・nextQrNumber、installationNoteだけのtrim、BOM/CRLF/quote、Place案のID順と未解決除外を6 tests / 20 assertionsで固定した。
- 全体ゲートは94 tests / 508 assertions、`verify:route-editor`、build、verify:places 36件、verify:routes 104 nodes / 112 edges、git diff --checkがPASSした。
- Vite配信の新規タブでgenerated core初期化、QRモード切替、空計画JSON保存、console error 0件を確認した。Browser file input APIがないため計画JSON再読込のブラウザ自動操作は未実施し、pure parse exact testで補完した。13kと同じ理由で `file://` のブラウザ自動確認も未実施。
- 初回独立レビューのP2（null配列要素の受理）とP3（既知sheet・未知nodeのfloor情報消失）を修正した。全ゲート再実行後の再レビューで指摘なし。
