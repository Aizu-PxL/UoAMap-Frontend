# 03b: 研究棟の階段接続(rq-1f ↔ rq-2f ↔ rq-3f)

## GOAL

研究棟1F〜3Fを階段で経路グラフに接続し、フロアをまたぐ最短経路を、表示中フロアの区間ごとに描画する。フロアをまたぐ箇所は階段ノード位置に乗換マーカーを表示し、ルートが通るフロアの切替ボタンにインジケータを表示する。

## 参照

- [SPEC.md](../SPEC.md) §3.3(階段接続のv1方式・表示)
- [MAP_AUTHORING.md](../MAP_AUTHORING.md)「階段接続」(data-stair-id契約・transferエッジ)
- [03a](03a-rq1f-route-vertical-slice.md)(前提スライス)
- `public/maps/RQ1F_base_plain.svg` / `RQ2F_base_plain.svg` / `RQ3F_base_plain.svg`

## やること

1. `src/data/types.ts`: `RouteEdge`を判別共用体にする
   - `{ id; kind: "walk"; floorId; nodeA; nodeB; distance; pathD }`
   - `{ id; kind: "transfer"; nodeA; nodeB; distance }`(floorIdなし)
2. `scripts/extract-routes.ts`: `data-stair-id`の読取と検証(MAP_AUTHORING「階段接続」の全ルール)、隣接フロアペアごとのtransferエッジ生成(固定コスト60)、既存エッジへの`kind: "walk"`付与。出力の決定的ソートを維持する
3. SVG作図(Routeグループのみ変更可。既存要素・ID・座標系は変更禁止):
   - RQ1F: 既存stairsノード(北東・中西・南東)へ`data-stair-id`付与
   - RQ2F / RQ3F: `<g id="Route" data-floor-id="rq-2f|rq-3f">`を新規作図。廊下ノード/エッジ、全地点の`data-place-id`ノード(2Fは6地点、3Fは5地点。IDは`src/data/places.ts`と一致)、階段ノード+`data-stair-id`
   - どの階段が1〜3Fを貫通しているかは、各フロアSVGの階段図形(`stairs_s23`等)の位置照合から推定して決める。最低2本の階段を全フロアで接続する。判断はDELIVERABLEで報告する
4. `bun run generate:routes`で`routeGraph.json`を再生成
5. `src/features/map/MapCanvas.tsx` + `src/styles/global.css`:
   - ルート線の描画フィルタを`edge.kind === "walk" && edge.floorId === floorId`へ(`hasVisibleRoute`も同様にガード)
   - transferエッジは、表示中フロア側のノード位置へ乗換マーカー`circle.map-route-transfer`を描画
   - ルートのwalkエッジが通るフロアの切替ボタンへ`--on-route`モディファイア(CSSインジケータ+aria-labelへの追記)
6. テスト(`src/features/routing/`):
   - フィクスチャ: 2フロア・2階段のグラフで安い方の階段が選ばれること、transferエッジが経路順に含まれること
   - 実グラフ: rq-1f→rq-3fの地点間経路が非nullでtransferエッジをちょうど2本含む。rq-1f→rq-2fは1本

Dijkstra本体(`findShortestRoute.ts`)は変更不要の想定。変更が必要になった場合は理由を報告する。

## SCOPE

- `docs/STATUS.md`, `docs/BACKLOG.md`, 本ブリーフ(チェックボックス更新)
- `public/maps/RQ1F_base_plain.svg`, `RQ2F_base_plain.svg`, `RQ3F_base_plain.svg`(Routeグループのみ)
- `scripts/extract-routes.ts`
- `src/data/types.ts`
- `src/features/routing/`(generated含む)
- `src/features/map/MapCanvas.tsx`, `src/styles/global.css`

## 受入基準

- [x] `bun test src/features/routing` が通る(実グラフのtransfer本数テストを含む)
- [x] `bun run verify:routes` が通る(stair-id検証が有効な状態で)
- [x] `bun run build` が通る
- [x] `bun run verify:places` が36件PASS
- [x] 幅402pxの `/?at=rq1-161&to=P12` で初期表示は3F区間のルート線と乗換マーカーが出る
- [x] 同URLで1Fへ切り替えると1F区間のルート線と乗換マーカーが出る
- [x] 同URLで1F/2F/3Fの切替ボタンすべてにルートインジケータが出る
- [x] コンソールエラーがない

ブラウザ受入4項目は2026-07-21にリードがブラウザ実機(dev server)で確認済み。

## DELIVERABLE

変更ファイル一覧、受入基準ごとのPASS/FAIL、階段作図の判断メモ(どの階段図形を照合し、どの`data-stair-id`を何フロアに置いたか)を報告する。
