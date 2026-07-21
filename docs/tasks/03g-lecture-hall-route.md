# 03g: 講義棟1F〜2Fとキャンパス経路

## GOAL

1枚のSVGに併記された講義棟1F・2Fへ、03dで定めた複数フロアRoute契約を適用する。大講義室・M8・M10・M2〜M7を東側階段と主入口でキャンパス屋外網へ接続し、Q003・講義棟開催イベント・他建物間の経路を表示できる状態にする。

## 参照

- [SPEC.md](../SPEC.md) §3.3
- [MAP_AUTHORING.md](../MAP_AUTHORING.md)「1枚に複数フロアを含むSVG」
- [03d](03d-routing-foundation-hardening.md)
- `public/maps/CampusMap_base_plain.svg`
- `public/maps/LH_base_plain.svg`

## やること

1. CampusMapの講義棟南側ノードを主入口として接続する
2. LHのRouteグループへ1F・2F別の`data-floor-id`付きノード・エッジを作図する
3. 1Fの大講義室・M8・M10、2FのM2〜M7を収録する
4. 東側階段の1F〜2F transferを生成する
5. 実グラフの同一階・階段・研究棟横断経路をテストする

## SCOPE

- 本ブリーフ
- `docs/STATUS.md`
- `public/maps/CampusMap_base_plain.svg`
- `public/maps/LH_base_plain.svg`
- `src/features/routing/generated/routeGraph.json`
- `src/features/routing/findShortestRoute.test.ts`

## 受入基準

- [x] 講義棟9地点が相互に到達可能
- [x] 1F〜2Fの東側階段transferが生成される
- [x] 研究棟から`lh-m2`へキャンパス・2入口・階段transferを通る経路が成立する
- [x] 複数フロアRouteの抽出・フロア別描画が成立する
- [x] `bun test`が通る
- [x] `bun run verify:routes`が91ノード/99エッジで通る
- [x] `bun run verify:places`が36件PASS
- [x] `bun run build`が通る
- [x] 幅402pxで講義棟内・階段・研究棟横断経路とコンソールエラーなしを確認する
- [x] `git diff --check`が通る

ブラウザ確認は2026-07-21に`/q/Q003?to=M21`と
`/?at=rq1-161&to=M21`で実施した。1F/2Fの双方でルート線・乗換マーカー・
ルートインジケータを確認した。

## DELIVERABLE

変更ファイル一覧、受入結果、複数フロア作図と東側階段・主入口の判断を報告する。
