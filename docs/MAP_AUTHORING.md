# MAP_AUTHORING — Routeレイヤー作図規約

最終更新: 2026-07-20

地図SVGと経路グラフを同じ座標系で管理するための契約。`public/maps/` の既存要素・ID・座標系は変更せず、経路要素だけを追加する。

## Routeグループ

- 経路を持つSVGのルート直下に `<g id="Route" data-floor-id="...">` を1つ置く
- `Route` とその子孫に `transform` を付けない。座標はSVGのviewBox座標を直接使う
- IDと属性値はASCII英数字・ハイフン・アンダースコアのみを使う
- Route要素は実アプリでは非表示にし、抽出済みグラフから専用オーバーレイへ描画する

### 1枚に複数フロアを含むSVG

講義棟(LH)のように1枚のSVGへ複数フロアを収録する場合も、SVGルート直下の
`<g id="Route">`は1つだけ置く。この場合はRouteグループ自身の`data-floor-id`を省略し、
すべてのRouteノードとRouteエッジへ、それぞれが属する`data-floor-id`を付ける。

```svg
<g id="Route">
  <circle
    id="route_node_1f_entrance"
    data-route-node=""
    data-floor-id="lh-1f"
    data-kind="entrance"
    cx="100"
    cy="200"
    r="2" />
  <path
    id="route_edge_1f_01"
    data-route-edge=""
    data-floor-id="lh-1f"
    data-node-a="route_node_1f_entrance"
    data-node-b="route_node_1f_junction"
    d="M 100 200 L 140 200" />
</g>
```

- `data-floor-id`は、そのSVGを使う`MapSheet`に属するFloorだけを指定できる
- ノードID・エッジIDはフロアごとに一意であればよいが、混同を避けるため`1f`/`2f`等を含める
- エッジは同じ`data-floor-id`のノード同士だけを接続する
- 単一フロアSVGでは従来どおりRouteグループの`data-floor-id`を使い、子要素への重複指定は行わない

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
- 同じ`data-place-id`は別SVG・別フロアを含むRouteグラフ全体で1回だけ使用できる
- 階段ノードのフロア間接続は後述「階段接続」、建物出入口(`entrance`)のシート間接続は「建物出入口接続」の規約に従う
- ノードは通路の曲がり角、分岐、地点入口、階段、建物出入口に置く

## 階段接続

同じ物理階段を指す各フロアの`stairs`ノードに、共通の`data-stair-id`を付ける。

```svg
<circle
  id="route_node_stairs_north_east"
  data-route-node=""
  data-kind="stairs"
  data-stair-id="rq-stairs-ne"
  cx="414"
  cy="76"
  r="2" />
```

- `data-stair-id`は`data-kind="stairs"`のノードにのみ付けられる。値はASCII英数字・ハイフン・アンダースコアのみ
- 同一フロア内で同じ`data-stair-id`は1回まで。同じIDは2フロア以上に出現しなければならない(孤立IDはエラー)
- 同じ`data-stair-id`を持つフロアは、`src/data/places.ts`の`floors`配列順で連続していなければならない(1Fと3Fにあって2Fにない、はエラー)
- 抽出スクリプトが隣接フロアのペアごとに**transferエッジ**を自動生成する。SVGにフロアをまたぐpathは描かない
  - 生成エッジID: `transfer:<stairId>:<floorA>:<floorB>`
  - 距離は固定コスト`60`(viewBox座標系のユーザー単位。短い廊下1本ぶん相当で、どの階段を選ぶかの比較にのみ効く)
- `data-stair-id`を持たない`stairs`ノードは従来どおり単なるフロア内ノードとして扱われる

## 建物出入口接続

同じ物理出入口を指す建物フロア側とキャンパス側の`entrance`ノードに、共通の`data-entrance-id`を付ける。

```svg
<circle
  id="route_node_entrance_west_main"
  data-route-node=""
  data-kind="entrance"
  data-entrance-id="rq-west-main"
  cx="33"
  cy="174"
  r="2" />
```

- `data-entrance-id`は`data-kind="entrance"`のノードにのみ付けられる。値はASCII英数字・ハイフン・アンダースコアのみ
- 1つの`data-entrance-id`は2ノードにだけ付け、片方を`floorId="campus"`、もう片方を建物フロアに置く
- 抽出スクリプトが2ノード間へ距離`0`の**transferエッジ**を自動生成する。SVGにシートをまたぐpathは描かない
  - 生成エッジID: `transfer:entrance:<entranceId>:campus:<buildingFloorId>`
- `data-entrance-id`を持たない`entrance`ノードは、専用の建物シートを持たない目的地の入口など、単一シート内の通常ノードとして扱われる

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
- `data-stair-id`の不正(パターン違反、`stairs`以外への付与、フロア内重複、孤立ID、フロア非連続)
- `data-entrance-id`の不正(パターン違反、`entrance`以外への付与、2ノード以外への付与、campus側と建物側の組合せ違反)
- 複数フロアSVGの`data-floor-id`不足・不一致・フロアをまたぐwalkエッジ
- Routeグラフ全体での`data-place-id`重複
- SVGからの抽出結果とコミット済みグラフJSONの差異

既存SVGを編集した後は、あわせて`bun run verify:places`を実行し、既存36地点のIDが保全されていることを確認する。
