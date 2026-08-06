# 28 Q018追加データ同期

## GOAL

受領した追加QR対応表とキャンパスSVGの`nazonobasyo` Routeノードをフロントの正式モックへ反映し、Q018を含む89件のQRをPlace・計画JSON・生成Routeグラフと同じ語彙で解決できる状態にする。

## 参照

- `docs/SPEC.md` §3.2、§3.3、§4、§5.2
- `docs/STATUS.md`
- `docs/HANDOFF.md`
- `docs/WORKFLOW.md`
- `uoamap-qr-mapping.json`
- `uoamap-qr-mappings.json`
- `uoamap-qr-placement-plan.json`
- `public/maps/CampusMap_base_plain.svg`

## やること

- [x] 追加JSONのQ018を正式対応表へ同期する。
- [x] `nazonobasyo`をSVG Placeとして登録し、Q018から解決できるようにする。
- [x] SVGからRouteグラフを再生成し、coverage・件数期待値を更新する。
- [x] SPEC、運用文書、検証ゲートの現行件数を89 QR／124 Place／61 Eventへ更新する。

## SCOPE

- `uoamap-qr-mapping.json`
- `uoamap-qr-mappings.json`
- `uoamap-qr-placement-plan.json`
- `public/maps/CampusMap_base_plain.svg`
- `src/data/places.ts`
- `scripts/verify-places.ts`
- `src/features/routing/routeGraphCoverage.test.ts`
- `scripts/routeExtractionCore.test.ts`
- `src/features/routing/generated/routeGraph.json`
- `docs/tasks/28-qr-q018-data-sync.md`
- `AGENTS.md`
- `README.md`
- `docs/SPEC.md`
- `docs/STATUS.md`
- `docs/HANDOFF.md`
- `docs/WORKFLOW.md`
- `docs/MAP_AUTHORING.md`
- `docs/PRODUCTION.md`
- `scripts/generate-qr-posters.ts`

既存のRoute以外のSVG要素、公開API、QRの物理印刷・設置承認は変更しない。git操作は行わない。

## 受入基準

- [x] `uoamap-qr-mappings.json`がQ001〜Q089を順番どおり含み、Q018が`nazonobasyo`を参照する。
- [x] Place 124件、QR 89件、Event 61件、`nextQrNumber: 91`で検証が通る。
- [x] Routeが350 nodes / 447 edges（walk 408 / transfer 39）で単一連結になり、全123 Route対応Placeを収録する。
- [x] `bun test`（128 tests / 1,029 assertions）、`bun run build`、`bun run verify:places`、`bun run verify:routes`、`bun run verify:all`、`git diff --check`がPASSする。
- [x] 幅402pxの`/q/Q018`と`/q/Q018?to=M21`で`nazonobasyo`へ解決し、ブラウザのコンソールエラーがない。

## DELIVERABLE

変更ファイル、検証結果、Q018のRoute連結、物理QR非承認の判断を記録した。会話履歴なしの読み取り専用独立レビューは指摘なし。コミットは行わない。
