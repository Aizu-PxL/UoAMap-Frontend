# 03i: 屋外残部と全地点Route coverage

## GOAL

ロボット格納庫と研究棟の建物地点をキャンパスRouteへ収録し、点として案内可能な全38 Placeを1つの連結グラフへ統合する。全域概念の`campus-all`だけを明示除外とし、イベント・QR地点を含む収録漏れを自動テストで固定してステップ3「ルート」を完了する。

## 参照

- [SPEC.md](../SPEC.md) §3.3 / §6
- [MAP_AUTHORING.md](../MAP_AUTHORING.md)
- [03h](03h-lictia-route.md)
- `public/maps/CampusMap_base_plain.svg`
- `src/data/places.ts`
- `src/data/mock/events.ts`

## やること

1. 研究棟campus側入口ノードを建物地点`rq`にも紐付ける
2. ロボット格納庫入口を既存キャンパス歩行網へ接続する
3. `campus-all`以外の全PlaceがRouteノードを持ち、講堂から到達可能であることをテストする
4. 全Routeノードが単一連結成分に属することをテストする
5. 全イベント地点(`campus-all`除外)とQ001〜Q003地点のcoverageをテストする
6. STATUS・BACKLOG・SPECの実装状況をステップ3完了へ更新する

## SCOPE

- 本ブリーフ
- `docs/SPEC.md`
- `docs/STATUS.md`
- `docs/BACKLOG.md`
- `public/maps/CampusMap_base_plain.svg`
- `src/features/routing/generated/routeGraph.json`
- `src/features/routing/findShortestRoute.test.ts`

## 受入基準

- [x] `campus-all`以外の全38 PlaceがRouteへ収録される
- [x] 全Routeノードが1つの連結成分に属する
- [x] 全イベント地点(`campus-all`除外)・Q001〜Q003地点が経路対応済み
- [x] 研究棟からロボット格納庫までの経路が成立する
- [x] `bun test`が28件PASS
- [x] `bun run verify:routes`が104ノード/112エッジで通る
- [x] `bun run verify:places`が36件PASS
- [x] `bun run build`が通る
- [x] 幅402pxでロボット格納庫への往復経路とコンソールエラーなしを確認する
- [x] `git diff --check`が通る

ブラウザ確認は2026-07-21に`/?at=rq1-161&to=P22`と
`/?at=robot-garage&to=P12`で実施した。

## DELIVERABLE

変更ファイル一覧、受入結果、coverageの明示除外とステップ3完了判断を報告する。
