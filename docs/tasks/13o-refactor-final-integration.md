# 13o — リポジトリ横断リファクタリング最終統合

## GOAL

syntheticな最短経路アルゴリズムtestと実生成グラフcoverageを分離し、全検証を一括実行する `verify:all` を追加する。参照検索で明白なdead codeだけを削除し、README・STATUS・HANDOFF・ExecPlanを実装事実へ更新したうえで、基準コミット `5b37580` 以降の累積差分を会話履歴なしで独立レビューし、M1〜M8を完了する。

## 参照

- `.agent/PLANS.md`
- `.agent/refactor-plan.md` M8
- `docs/WORKFLOW.md`
- `docs/SPEC.md`
- `docs/STATUS.md`
- `docs/HANDOFF.md`
- `docs/tasks/13a-refactor-preparation.md`〜`13n-route-editor-route-xml.md`

## やること

- `findShortestRoute.test.ts` には合成グラフのアルゴリズムtestだけを残す。
- 実 `routeGraph`、全Place・event・QR、単一連結性、建物/階段/入口経路は独立coverage testへ移す。
- 既存ゲートを弱めず順番に再現する `bun run verify:all` を追加する。
- `rg` による静的・動的参照検索とstrict型検査の証跡を残し、明白なdead codeだけを削除する。候補がなければ削除しない。
- READMEへプロジェクト概要、開発開始、検証、主要文書、route editor生成/検証を記載する。
- STATUS・HANDOFF・ExecPlanをM8完了事実、最終検証、既知の自動化制約へ更新する。
- 基準コミット `5b37580` から最終作業ツリーまでの累積差分を、会話履歴なし読み取り専用レビューへ渡す。

## SCOPE

- `src/features/routing/findShortestRoute.test.ts`
- `src/features/routing/routeGraphCoverage.test.ts`
- `package.json`
- `README.md`
- `.agent/refactor-plan.md`
- `docs/STATUS.md`
- `docs/HANDOFF.md`
- `docs/tasks/13o-refactor-final-integration.md`
- 参照検索で明白なdead codeと確認できたファイル（存在する場合だけ、レビュー前にSCOPEへ追記）

外部仕様・UI・URL・Repository/API契約・SVG・生成データ・依存追加・公開は対象外。

## 受入基準

- synthetic testと実グラフcoverageが別ファイルになり、test/assertion総数と検証内容を減らさない。
- `bun run verify:all` が `bun test`、build（route editor鮮度と全strict型検査を含む）、verify:places、verify:routes、git diff --checkを順に実行してPASSする。
- dead code削除は参照検索で明白なものだけとし、候補がなければ無理に変更しない。
- README・STATUS・HANDOFF・ExecPlanが現行コマンド、内部境界、最終件数、M1〜M8完了、未実施の外部作業と自動化制約を正確に記録する。
- 幅402pxの主要URLとroute editorのVite代表操作でconsole error 0件を最終確認する。
- `5b37580` 以降の累積差分に対する会話履歴なし読み取り専用レビューで指摘がない。

## DELIVERABLE

- 分離済みrouting tests
- `verify:all`
- 更新済みREADME/STATUS/HANDOFF/ExecPlan
- dead code参照検索結果
- 最終検証・累積独立レビュー結果

## 実行結果

- `findShortestRoute.test.ts` を6 synthetic tests、`routeGraphCoverage.test.ts` を19実グラフcoverage testsへ分離し、両ファイル合計25 tests / 351 assertions、全体105 tests / 551 assertionsを維持した。
- `bun run verify:all` がtest、route editor生成鮮度、scripts/toolsを含むstrict型検査、production build、36 places、104 nodes / 112 edges、git diff --checkまでPASSした。
- 全exportと動的参照を `rg` で検索しstrict型検査と照合した。定義ファイル内だけで使われる型・test helper exportはあるが、外部契約を変えず安全に削除できるruntime dead codeはなかったため、削除対象は0件とした。
- READMEへ現行の開発開始、`verify:all`、個別検証、SVG/Route editor生成、主要文書を記載した。
- 幅402pxで `/?at=rq1-161&to=P12`、`/events?highlight=P20`、`/q/Q003?to=M21` を確認し、URL正規化、経路・highlight表示、console error 0件。route editorはVite配信1440×900で全10 SVG読込、Undo/Redo、自動採番非巻戻し、SVG download、console error 0件を確認した。
- Browser security policyが `file://` を拒否し、ファイル入力APIも提供しないため、`file://` と計画JSON再読込のブラウザ自動操作は未実施。単一HTML・外部scriptなし・全10ファイル同期・生成鮮度とpure parse exact testで補完した。
- 基準コミット `5b37580` 以降の累積差分と13oの最終作業ツリーを会話履歴なし読み取り専用で独立レビューし、指摘なし。M8とリポジトリ横断リファクタリングを完了した。
