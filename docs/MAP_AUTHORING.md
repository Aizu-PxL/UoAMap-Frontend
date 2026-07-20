# MAP_AUTHORING — Routeレイヤー作図規約

最終更新: 2026-07-20

地図SVGと経路グラフを同じ座標系で管理するための契約。`public/maps/` の既存要素・ID・座標系は変更せず、経路要素だけを追加する。

## Routeグループ

- 経路を持つSVGのルート直下に `<g id="Route" data-floor-id="...">` を1つ置く
- `Route` とその子孫に `transform` を付けない。座標はSVGのviewBox座標を直接使う
- IDと属性値はASCII英数字・ハイフン・アンダースコアのみを使う
- Route要素は実アプリでは非表示にし、抽出済みグラフから専用オーバーレイへ描画する
- 1枚に複数フロアを含むLHの規約は、フロア間ルートを実装するスライスで追加する

## ノード

ノードは次の形式の`circle`で置く。

```svg
<circle
  id="route_node_north_junction"
  data-route-node=""
  data-kind="corridor"
  cx="100"
  cy="80"
  r="2" />
```

- `data-kind`: `corridor` / `stairs` / `entrance`
- イベント会場やQR地点へ接続するノードには `data-place-id="<Place.id>"` を付ける
- `data-place-id`は`src/data/places.ts`に存在するIDだけを使い、1地点につき1ノードとする
- 階段・出入口は将来のフロア／シート間接続点になる。接続規約は次スライスで確定する
- ノードは通路の曲がり角、分岐、地点入口、階段、建物出入口に置く

## エッジ

エッジは次の形式の`path`で置く。

```svg
<path
  id="route_edge_north_01"
  data-route-edge=""
  data-node-a="route_node_north_west"
  data-node-b="route_node_north_junction"
  d="M 40 80 L 100 80" />
```

- 1エッジは2ノード間の直線とする。曲がり角ではノードを追加して分割する
- `d`は絶対座標の `M x y L x y` だけを使用する
- パスの始終点は参照ノードの`cx`/`cy`と一致させる
- 距離は抽出時にノード座標間のユークリッド距離から生成する
- 交差するだけの線は接続されない。分岐させる場合は交点にノードを置き、エッジを分割する

## 抽出と検証

```bash
bun run generate:routes
bun run verify:routes
```

`verify:routes`は次を検証する。

- Routeグループ、ノード、エッジのID重複
- 未登録Place、未定義ノードを参照するエッジ
- 不正なkind、座標、path形式
- Route内のtransform
- path始終点とノード座標の不一致
- SVGからの抽出結果とコミット済みグラフJSONの差異

既存SVGを編集した後は、あわせて`bun run verify:places`を実行し、既存36地点のIDが保全されていることを確認する。
