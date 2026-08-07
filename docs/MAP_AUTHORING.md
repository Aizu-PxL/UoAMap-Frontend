# MAP_AUTHORING — Routeレイヤー作図規約

最終更新: 2026-07-21

地図SVGと経路グラフを同じ座標系で管理するための契約。`public/maps/` の既存要素・ID・座標系は変更せず、経路要素だけを追加する。

既存ノードをInkscapeで目視調整する人は、先に [ROUTE_EDITING_GUIDE.md](ROUTE_EDITING_GUIDE.md) を参照する。

## Routeグループ

- 1枚のSVGは1つのFloorだけを表す。複数フロアを1枚へ併記しない
- 経路を持つSVGのルート直下に `<g id="Route" data-floor-id="...">` を1つ置く
- `data-floor-id`は、そのSVGを使うMapSheetに登録された唯一のFloorと一致させる
- Routeノード・Routeエッジには`data-floor-id`を重複指定しない
- `Route` とその子孫に `transform` を付けない。座標はSVGのviewBox座標を直接使う
- IDと属性値はASCII英数字・ハイフン・アンダースコアのみを使う
- Route要素は実アプリでは非表示にし、抽出済みグラフから専用オーバーレイへ描画する

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

## QR設置計画

`tools/route-editor.html` の「QR候補」モードでは、QRを読む来場者が立つRouteノードへ候補を配置する。壁面の掲示位置ではなく、ルート開始地点として妥当な歩行可能位置のノードを選ぶ。

1. 「全マップ読込」で10枚を読み込む
2. 「QR候補」を選び、対象Routeノードをクリックする
3. 自動採番された`Q001`形式のQR ID、固定／可変、設置メモを確認する
4. ノードに既存`data-place-id`があれば再利用する。無ければPlace IDと表示名を入力し、座標Place案を作る
5. 途中状態は「計画JSONを保存」で保存し、後日「計画JSONを読込」で置換復元する
6. QR検証がPASSしたら、対応表JSON／CSVと必要なPlace案JSONを出力する

対応表JSONは`src/data/types.ts`の`QrCode[]`と同じ`qrId / placeId / kind / installationNote`だけを含む。計画中のフロア、Routeノード、座標は計画JSONへ分離し、公開APIのレスポンスへは含めない。同じPlaceへ複数QRを割り当てる場合は、QRプロパティの「同じ地点にQRを追加」を使う。

編集を戻すときは、ツールバーの「元に戻す」／「やり直す」、または`Ctrl/Cmd + Z`／`Ctrl/Cmd + Shift + Z`（Windowsでは`Ctrl + Y`も可）を使う。ノードのドラッグと設置メモ・Place名の連続入力はそれぞれ1操作として記録され、履歴はブラウザセッション内で最大100操作保持される。入力欄にフォーカスがある間は文字入力だけのUndoが優先される。SVGを読み直すと履歴は消えるが、計画JSONの読込は1操作として元へ戻せる。自動採番済みのQR・ノード・エッジ番号はUndoしても再利用されない。

新規Place案を作ると、ダウンロード対象SVGのRouteノードにも`data-place-id`が付く。Place案JSONの内容を`src/data/places.ts`へ実装してからSVGを反映し、以下の抽出・検証を行う。QR候補を削除してもPlace案と`data-place-id`は自動削除されないため、不要ならノードのPlace IDを明示的に解除する。

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
- 1 MapSheet = 1 Floor、Routeグループの`data-floor-id`一致、子要素への重複指定禁止
- Routeグラフ全体での`data-place-id`重複
- SVGからの抽出結果とコミット済みグラフJSONの差異

既存SVGを編集した後は、あわせて`bun run verify:places`を実行し、125 Place・89 QR・61 Eventの参照と座標範囲が保全されていることを確認する。
