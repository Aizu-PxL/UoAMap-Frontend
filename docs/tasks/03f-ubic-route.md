# 03f: UBIC室内とキャンパス経路

## GOAL

UBICの3Dシアター・研究ラボエリア・運動解析ルームをRouteグラフへ収録し、UBIC西側主入口をキャンパス屋外網へ接続する。建物地点`ubic`を現在地にするQ002と、UBIC開催イベント・他建物との往復経路を表示できる状態にする。

## 参照

- [SPEC.md](../SPEC.md) §3.3
- [MAP_AUTHORING.md](../MAP_AUTHORING.md)
- [03e](03e-student-hall-route.md)
- `public/maps/CampusMap_base_plain.svg`
- `public/maps/UBIC_base_plain.svg`

## やること

1. CampusMapのUBIC西側入口を研究棟西側入口へ続く歩行帯へ接続する
2. campus側入口ノードを建物地点`ubic`にも紐付ける
3. UBIC内の3地点・主廊下・入口をRouteとして作図する
4. 実グラフのUBIC内・研究棟横断経路をテストする

## SCOPE

- 本ブリーフ
- `docs/STATUS.md`
- `public/maps/CampusMap_base_plain.svg`
- `public/maps/UBIC_base_plain.svg`
- `src/features/routing/generated/routeGraph.json`
- `src/features/routing/findShortestRoute.test.ts`

## 受入基準

- [x] UBIC内3地点が相互に到達可能
- [x] `ubic`からUBIC内3地点へ入口transferを通って到達可能
- [x] 研究棟から`ubic-motion`へキャンパス・2入口transferを通る経路が成立する
- [x] `bun test`が通る
- [x] `bun run verify:routes`が75ノード/82エッジで通る
- [x] `bun run verify:places`が36件PASS
- [x] `bun run build`が通る
- [x] 幅402pxでUBIC内・研究棟横断経路とコンソールエラーなしを確認する
- [x] `git diff --check`が通る

ブラウザ確認は2026-07-21に`/?at=ubic-3d-theater&to=P18`と
`/?at=rq1-161&to=P19`で実施した。

## DELIVERABLE

変更ファイル一覧、受入結果、採用したUBIC入口と室内廊下の判断を報告する。
