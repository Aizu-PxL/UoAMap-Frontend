# 13c — 経路探索結果から表示モデルを導出

## GOAL

経路探索結果から表示に必要なフロア、フロア別walk edge、transfer nodeを純粋関数で一度だけ導出し、`MapCanvas` から生成 `routeGraph` への直接依存と重複計算を外す。経路線、乗換マーカー、フロア・キャンパスのルートインジケータは変更しない。

## 参照

- `docs/SPEC.md` §3.3、§5.3
- `.agent/refactor-plan.md` M2
- `docs/STATUS.md`「ルート」
- `src/app/AppLayout.tsx`
- `src/features/map/MapCanvas.tsx`
- `src/features/routing/findShortestRoute.ts`

## やること

- `routeEdges` と `routeNodes` を受け取り、route floorとフロア別walk edge / transfer nodeを返す純粋な表示モデルを追加する。
- walk edgeの入力順、transfer-onlyフロア、同一transfer nodeの重複排除、未知endpointを無視する現行挙動をcharacterization testで固定する。
- 実グラフの研究棟3Fと講堂の正逆経路で、RQ2Fのtransfer-only表示とキャンパス戻り対象を固定する。
- `AppLayout` で探索結果から表示モデルを生成し、`MapCanvas` は表示モデルだけを受け取る。
- `MapCanvas` から生成 `routeGraph` のimportとnode indexを削除する。

## SCOPE

- `src/features/routing/routePresentation.ts`
- `src/features/routing/routePresentation.test.ts`
- `src/app/AppLayout.tsx`
- `src/features/map/MapCanvas.tsx`
- `.agent/refactor-plan.md`
- `docs/STATUS.md`
- `docs/HANDOFF.md`
- `docs/tasks/13c-route-presentation.md`

SVG、生成Route JSON、RouteGraph型、探索アルゴリズム、見た目は変更しない。

## 受入基準

- 空経路、walkフロア分配、transfer-onlyフロア、重複排除、未知endpoint無視が単体テストで固定される。
- 実グラフの正逆経路が同じ4フロアを含み、RQ2Fはwalkなし・transfer node 1件となる。
- `MapCanvas` が生成 `routeGraph` を直接importせず、経路表示の再導出を行わない。
- `bun test`、`bun run verify:routes`、`bun run verify:places`、`bun run build`、`git diff --check` がPASSする。
- 幅402pxで複数階・建物横断の正逆経路、transfer marker、フロア・キャンパスインジケータ、console errorなしを確認する。
- 会話履歴を引き継がない読み取り専用レビューで指摘がない。

## DELIVERABLE

- `src/features/routing/routePresentation.ts` に `createRoutePresentation(routeEdges, routeNodes)` を追加し、経路フロア、フロア別walk edge、transfer nodeを一度だけ導出。
- 4件のcharacterization testで、空経路、入力順、transfer-onlyフロア、重複排除、未知endpoint無視、実グラフ正逆経路を固定。
- `AppLayout` をcomposition boundaryとして表示モデルを生成し、`MapCanvas` の生成 `routeGraph` 直接参照とnode indexを除去。
- 自動検証: `bun test` 49件 / 412 assertions、`bun run verify:routes` 104 nodes / 112 edges、`bun run verify:places` 36件、`bun run build`、`git diff --check` がPASS。
- ブラウザ検証: 幅402pxで研究棟1F→3Fの2Fがwalk path 0・transfer marker 1、研究棟3F→講堂、講堂→研究棟3Fの正逆経路を確認し、console error 0件。
- 独立レビュー: 初回P2 2件（walk入力順、逆経路transfer-onlyのassert不足）を修正・再検証し、再レビューP3の検証件数記録をユーザー承認に基づき訂正。最終レビューで指摘なし。
