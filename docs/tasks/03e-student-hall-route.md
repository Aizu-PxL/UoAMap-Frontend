# 03e: 学生ホール1F〜2Fとキャンパス経路

## GOAL

学生ホールの食堂・受付・ホール・売店をRouteグラフへ収録し、キャンパス屋外網と学生ホール1F〜2Fを入口・階段transferで接続する。Q001や学生ホール開催イベントを現在地・目的地にして、研究棟を含む既存地点との往復経路を表示できる状態にする。

## 参照

- [SPEC.md](../SPEC.md) §3.3
- [MAP_AUTHORING.md](../MAP_AUTHORING.md)
- [03d](03d-routing-foundation-hardening.md)
- `public/maps/CampusMap_base_plain.svg`
- `public/maps/SH1F_base_plain.svg`
- `public/maps/SH2F_base_plain.svg`

## やること

1. CampusMapの既存学生ホール北側ノードを公開入口として接続する
2. SH1Fに4地点・主廊下・中央階段のRouteを作図する
3. SH2Fに中央階段と着地点を作図し、1F〜2F transferを生成する
4. 複合地点`sh-reception`を受付位置の座標マッピングへ変更する
5. 実グラフの学生ホール内・研究棟横断経路をテストする

## SCOPE

- 本ブリーフ
- `docs/STATUS.md`
- `public/maps/CampusMap_base_plain.svg`
- `public/maps/SH1F_base_plain.svg`
- `public/maps/SH2F_base_plain.svg`
- `src/data/places.ts`
- `src/features/routing/generated/routeGraph.json`
- `src/features/routing/findShortestRoute.test.ts`

## 受入基準

- [x] SH1Fの4地点が相互に到達可能
- [x] SH1F〜SH2Fの階段transferが生成される
- [x] `rq1-161`から`sh-cafeteria`へキャンパス・入口transferを通る経路が成立する
- [x] `bun test`が通る
- [x] `bun run verify:routes`が67ノード/74エッジで通る
- [x] `bun run verify:places`が36件PASS
- [x] `bun run build`が通る
- [x] 幅402pxで学生ホール内・研究棟横断経路、1Fインジケータ、コンソールエラーなしを確認する
- [x] `git diff --check`が通る

ブラウザ確認は2026-07-21に`/?at=sh-hall&to=S`と
`/?at=rq1-161&to=W`で実施した。SH2Fは現行Placeがないため実URLの目的地にはならないが、
中央階段transferの生成と2F切替ボタンの表示を機械検証した。

## DELIVERABLE

変更ファイル一覧、受入結果、採用した入口・階段・受付座標の判断を報告する。
