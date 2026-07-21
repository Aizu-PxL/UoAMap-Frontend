# 03h: LICTiA室内とキャンパス経路

## GOAL

LICTiAのイノベーション創出スペースと箱庭チャンバー室をRouteグラフへ収録し、東側主入口をキャンパス北側歩行経路へ接続する。SVGに専用要素がない箱庭チャンバー室は、検証室の位置を座標アンカーとして確定し、ピン・フォーカス・経路を一貫して表示できる状態にする。

## 参照

- [SPEC.md](../SPEC.md) §3.3
- [MAP_AUTHORING.md](../MAP_AUTHORING.md)
- [03g](03g-lecture-hall-route.md)
- `public/maps/CampusMap_base_plain.svg`
- `public/maps/LICTiA1F_base_plain.svg`

## やること

1. UBIC西側入口からキャンパス北側を通るLICTiA東側アプローチを作図する
2. LICTiAの主入口・廊下・2地点をRouteとして作図する
3. `lictia-chamber`を検証室中心の座標マッピングへ変更する
4. 実グラフのLICTiA内・研究棟横断経路をテストする

## SCOPE

- 本ブリーフ
- `docs/STATUS.md`
- `public/maps/CampusMap_base_plain.svg`
- `public/maps/LICTiA1F_base_plain.svg`
- `src/data/places.ts`
- `src/features/routing/generated/routeGraph.json`
- `src/features/routing/findShortestRoute.test.ts`

## 受入基準

- [x] LICTiA内2地点が相互に到達可能
- [x] `lictia-chamber`のピン・フォーカス位置が解決できる
- [x] 研究棟から`lictia-innovation`へキャンパス・2入口transferを通る経路が成立する
- [x] `bun test`が通る
- [x] `bun run verify:routes`が102ノード/110エッジで通る
- [x] `bun run verify:places`が36件PASS
- [x] `bun run build`が通る
- [x] 幅402pxでLICTiA内・研究棟横断経路とコンソールエラーなしを確認する
- [x] `git diff --check`が通る

ブラウザ確認は2026-07-21に`/?at=lictia-innovation&to=P20`と
`/?at=rq1-161&to=P21`で実施した。座標マッピングした箱庭チャンバー室にも
目的地ピンが表示されることを確認した。

## DELIVERABLE

変更ファイル一覧、受入結果、箱庭チャンバー室座標・LICTiA入口・キャンパス北側経路の判断を報告する。
