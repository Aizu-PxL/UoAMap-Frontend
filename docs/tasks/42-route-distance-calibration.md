# 42: ルート距離のキャンパス相対校正

## GOAL

SVGごとに異なる座標倍率をそのまま加算していた経路重みを、同一出入口・階段の対応点からキャンパスSVG基準へ校正する。Dijkstraの公開インターフェースと単一距離最小化を維持しつつ、研究棟・講義棟内でキャンパスへ出て回り込む縮尺由来の経路を解消する。屋内常時優先のルールは追加せず、校正後も屋外が短い場合はその経路を許容する。

## 参照

- [SPEC.md](../SPEC.md) §3.3 / §4 / §5.3
- [MAP_AUTHORING.md](../MAP_AUTHORING.md)「階段接続」「建物出入口接続」
- [WORKFLOW.md](../WORKFLOW.md)
- `scripts/routeExtractionCore.ts`
- `src/features/routing/findShortestRoute.ts`
- `src/features/routing/routeGraphCoverage.test.ts`

## やること

1. campusを倍率1とし、指定した親子フロア間の同一transfer対応点2点以上から、全点対距離の最小二乗で子フロアの単一倍率を導出する。
2. 対応点の正規化RMSE 15%上限、校正親の不明・循環・点不足・ゼロ基線を検証エラーにする。
3. walk距離をフロア倍率で事前校正し、階段コストを`60 * sqrt(scaleA * scaleB)`、入口コストを0として生成する。
4. UBIC・LICTiAは入口1か所・階段なしの間だけ倍率1のtopology-neutral fallbackを許可し、構造が変わったら生成を拒否する。
5. 生成グラフへ単位・倍率・校正元transfer・RMSEを監査メタデータとして保存する。Dijkstra、node座標、`pathD`、SVGは変更しない。
6. 実グラフの校正倍率と代表経路をテストで固定し、既存の全Place・イベント・QR・連結性を維持する。

## SCOPE

- `docs/SPEC.md`
- `docs/MAP_AUTHORING.md`
- `docs/STATUS.md`
- `docs/HANDOFF.md`
- 本ブリーフ
- `src/data/types.ts`
- `scripts/routeDistanceCalibration.ts`
- `scripts/routeDistanceCalibration.test.ts`
- `scripts/routeExtractionCore.ts`
- `scripts/routeExtractionCore.test.ts`
- `scripts/extract-routes.ts`（必要時のみ）
- `src/features/routing/generated/routeGraph.json`
- `src/features/routing/routeGraphCoverage.test.ts`

## 受入基準

- [x] `routeGraph.json`のwalk距離がキャンパス相対単位で生成され、node座標・`pathD`・350 nodes / 448 edgesを維持する。
- [x] 実グラフの校正倍率が、RQ `0.330 / 0.310 / 0.309`、LH `0.281 / 0.270`、SH `0.709 / 0.640`の近傍になる。
- [x] 校正親の不明・循環・対応点不足・ゼロ基線・RMSE 15%超、およびfallbackフロアの2入口目／階段追加をテストで拒否する。
- [x] `/q/Q081?to=P17`相当は講義棟1F内、`/q/Q023?to=P2`相当は研究棟1F内だけを通る。
- [x] 研究棟から講義棟2Fは`lh_east2f`入口を使い、`/q/Q083?to=R1`相当は校正距離に従って屋外経路を維持する。
- [x] `bun.cmd run generate:routes`、`bun.cmd test`、`bun.cmd run verify:routes`、`bun.cmd run verify:places`、`bun.cmd run build`、`bun.cmd run verify:all`がPASSする。
- [x] 会話履歴なしの読み取り専用独立レビューを通す。

## DELIVERABLE

変更ファイル一覧、導出した倍率と校正品質、代表経路の変更、各受入コマンドのPASS/FAIL、残存リスクを報告する。

402×874pxのブラウザでは、`/q/Q081?to=P17`が講義棟1Fのwalk 9本だけ、`/q/Q023?to=P2`が研究棟1Fのwalk 12本だけを描画し、いずれもtransfer 0本だった。`/?at=rq_room_161&to=M21`は研究棟1Fから`campus:route_edge_main_node_28_to_main_lh_entrance_east2f`を経て講義棟2Fへ到着した。`/q/Q083?to=R1`は学生ホール東口から正面入口までcampus walk 2本を通る屋外経路を維持した。全URLでルート線・フロア切替・現在地／目的地表示に異常がなく、console error/warnは0件だった。

会話履歴なしの読み取り専用独立レビューは指摘なし。
