# 13j — Route抽出器を副作用なしcoreへ分離

## GOAL

`extractRouteGraph({ sources, mapSheets, floors, places })` とserializerを副作用なしcoreへ抽出し、CLIをファイルI/O・`--check`・終了処理だけにする。実10 SVGの生成JSON完全一致と `MAP_AUTHORING` の主要な不正fixtureを固定し、scripts/toolsをbuild時のstrict型検査へ含める。

## 参照

- `docs/MAP_AUTHORING.md`
- `docs/SPEC.md` §4、§5.3
- `.agent/refactor-plan.md` M6
- `scripts/extract-routes.ts`
- `src/features/routing/generated/routeGraph.json`

## やること

- SVG文字列source、MapSheet、Floor、Placeを入力にするasync pure coreを追加する。
- Route解析、全検証、stair/entrance transfer生成、決定的sortをcoreへ移す。
- `{ graph, errors }` を返し、console、filesystem、argv、process.exitをcoreから除去する。
- `serializeRouteGraph(graph)` で現在の2-space JSON＋末尾改行を固定する。
- CLIは10 SVG読込、core呼出、error表示、`--check`比較、書込、終了だけを担当する。
- 実10 SVGと生成JSONの完全バイト一致、およびRoute group/node/edge/transform/stair/entranceの主要な不正fixtureを追加する。
- `@types/bun` をdevDependency/lockfileへ追加し、`tsconfig.tools.json` でscripts/toolsをstrict型検査し、root build referenceへ加える。

## SCOPE

- `scripts/routeExtractionCore.ts`
- `scripts/routeExtractionCore.test.ts`
- `scripts/extract-routes.ts`
- `scripts/verify-places.ts`（strict型検査で判明した既存type guardの正確化のみ）
- `tsconfig.tools.json`
- `tsconfig.json`
- `package.json`
- `bun.lock`
- `.agent/refactor-plan.md`
- `docs/STATUS.md`
- `docs/HANDOFF.md`
- `docs/tasks/13j-route-extraction-core.md`

SVG、生成routeGraph JSON、RouteGraph形式、Repository/API、route editor、依存更新（`@types/bun`以外）は対象外。

## 受入基準

- coreからfilesystem、console、argv、process.exit、具体places registryへの依存を除去する。
- 実10 SVGのcore抽出結果が104 nodes / 112 edgesで、serializer結果が生成JSONと完全バイト一致する。
- Route group直下/floor/transform、node kind/座標/place、edge参照/path/始終点、stair/entranceの主要な不正fixtureを固定する。
- CLIのgenerate/check成功文言と失敗文言、出力パス、`--check`契約を維持する。
- scripts/toolsがstrict型検査され、buildで実行される。
- `bun test`、`bun run verify:routes`、`bun run verify:places`、`bun run build`、`git diff --check` がPASSする。
- 生成JSONに差分がない。
- 会話履歴を引き継がない読み取り専用レビューで指摘がない。

## DELIVERABLE

- `scripts/routeExtractionCore.ts` と8件23 assertionsのcharacterization testを追加した。
- `scripts/extract-routes.ts` をSVG/JSON I/O、`--check`、表示、終了だけのCLIへ縮小した。
- `@types/bun@1.3.14`、`tsconfig.tools.json`、root project referenceを追加し、scripts/toolsをbuild時のstrict型検査へ含めた。
- strict型検査で判明した `verify-places.ts` のtype guardを、実行時挙動不変のままsvg mappingだけを表す型へ正確化した。
- `bun test`: 84 tests / 477 assertions PASS
- `bun run build`: PASS（app/node/scripts/tools strict型検査＋Vite build）
- `bun run verify:places`: 36件 PASS
- `bun run verify:routes`: 104 nodes / 112 edges PASS
- `bun run generate:routes`: 104 nodes / 112 edgesで成功し、生成JSON差分ゼロ
- `git diff --check`: PASS
- 独立レビュー: P3のSCOPE記載漏れを修正し、会話履歴なしの読み取り専用再レビューで指摘なし。
