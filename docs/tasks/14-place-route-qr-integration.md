# 14 Place・Route・QR計画JSON統合

## GOAL

74件のQR Place案、34件のイベント会場、`campus-all`を109 Placeへ統合し、Q001〜Q074、60イベント、新SVG Route、生成グラフを同じPlace語彙で動作させる。旧Place IDは廃止し、計画JSONとランタイムJSONは今回の変更で手動同期する。

## 参照

- `docs/SPEC.md` 3.2、3.3、4章、5.2
- `docs/API.md`
- `.agent/place-route-qr-integration-plan.md`
- `docs/MAP_AUTHORING.md`
- `uoamap-qr-placement-plan.json` / `uoamap-place-proposals.json`

## やること

1. 74 Place案とQ001〜Q074をランタイムデータへ反映し、Q034表記を全成果物で修正する。
2. イベントのPlace IDを意味一致する新RouteノードIDへ移行する。
3. 31既存Routeノードへ`data-place-id`を追加し、M8・学生ホール受付・UBIC 3Dシアターへ専用Routeノードとエッジを追加する。
4. Place/計画/QR/Event/Routeの整合検証とcoverageを新件数へ更新し、Routeグラフを再生成する。
5. 仕様・運用文書を新ID・新件数・新検証URLへ更新する。

## SCOPE

- `.agent/place-route-qr-integration-plan.md`
- `AGENTS.md`
- `docs/SPEC.md`, `docs/API.md`, `docs/STATUS.md`, `docs/HANDOFF.md`, `docs/WORKFLOW.md`, `docs/MAP_AUTHORING.md`, `docs/PRODUCTION.md`, `docs/tasks/14-place-route-qr-integration.md`
- `uoamap-qr-placement-plan.json`, `uoamap-place-proposals.json`, `uoamap-qr-mappings.json`
- `tsconfig.app.json`, `tsconfig.tools.json`
- `src/data/places.ts`, `src/data/mock/events.ts`, `src/data/mock/mockRepository.ts`, `src/data/types.ts`
- `scripts/verify-places.ts`, `scripts/routeExtractionCore.test.ts`
- `src/app/navigationSearch.test.ts`, `src/features/qr/qrValue.test.ts`
- `src/features/routing/generated/routeGraph.json`, `src/features/routing/routeGraphCoverage.test.ts`, `src/features/routing/routePresentation.test.ts`
- `public/maps/CampusMap_base_plain.svg`, `RQ1F_base_plain.svg`, `RQ2F_base_plain.svg`, `RQ3F_base_plain.svg`, `LH1F_base_plain.svg`, `LH2F_base_plain.svg`, `SH1F_base_plain.svg`, `UBIC_base_plain.svg`, `LICTiA1F_base_plain.svg`

SCOPE外のファイルは変更しない。SVGはRouteグループ以外を変更しない。

## 受入基準

- [x] Place 109件、Route対応108件、Event 60件、QR 74件が一意かつ参照整合する
- [x] 計画JSONの74 placements / 74 placeProposals / nextQrNumber 75を維持し、出力JSONと一致する
- [x] Q034のPlace名・設置メモが「講義棟エレベーター前１階」で統一される
- [x] Routeが336 nodes / 425 edges（walk 387 / transfer 38）で単一連結になる
- [x] `bun run verify:places`, `bun run verify:routes`, `bun test`, `bun run build`, `git diff --check`, `bun run verify:all`がPASSする
- [x] 幅402pxの指定URLとconsole error 0件を確認する
- [x] 会話履歴なしの読み取り専用レビューで指摘なしになる

## DELIVERABLE

変更ファイル、検証PASS/FAIL、Place ID移行・手動JSON同期・物理QR非承認の判断を報告する。コミットは行わない。
