# ルートノード目視調整ガイド

この文書は、地図上のルート線を見ながら、人の判断で既存のルートノード位置を調整するための手順書です。
SVGや経路探索の実装を知らなくても作業できるよう、**Inkscapeで位置を決め、VS Codeで安全に反映する方法**を説明します。

作図データの厳密な契約は [MAP_AUTHORING.md](MAP_AUTHORING.md) が正です。迷った場合は本書よりそちらを優先してください。

## 1. 最初に知っておくこと

ルートの正本は、`public/maps/` にある各SVGの `<g id="Route">` です。
`src/features/routing/generated/routeGraph.json` はSVGから自動生成されるため、**直接編集しません**。

Routeの中では、次の2種類の図形を使っています。

- **丸 (`circle`)**: ルートノード。通路上の点、曲がり角、階段、入口、目的地点を表す
- **線 (`path`)**: エッジ。2つのルートノード間を歩けることを表す

アプリは線の見た目ではなく、ノードとエッジの接続関係から最短経路を計算します。
線が交差して見えても、交点にノードがなければ接続されません。

## 2. 変更してよい範囲

編集してよいのは、各SVGの `<g id="Route">` とその中身だけです。

次のものは変更禁止です。

- `Route` より外側の地図要素
- `room_*`、`building_*`、`area_*` など既存要素のID
- SVG全体の `width`、`height`、`viewBox`
- 既存地図の座標系や `transform`
- `src/features/routing/generated/routeGraph.json` の手編集

既存ノードの位置だけを調整する場合、原則として次だけを変えます。

1. 対象ノードの `cx` と `cy`
2. そのノードにつながる全エッジの `d`
3. 自動生成される `routeGraph.json`

ノードやエッジのID、`data-place-id`、`data-stair-id`、`data-entrance-id`、`data-floor-id` は変更しません。

## 3. ノードを置く位置の判断基準

ノードは「図形の中心」ではなく、**来場者が実際に歩く位置**へ置きます。

| ノードの役割 | 置く位置 |
|---|---|
| 通路上の点 | 歩行可能な通路の中央 |
| 曲がり角 | 曲がり始める地点。角を斜めに突っ切らない位置 |
| 分岐 | 実際に進行方向を選べる地点 |
| 会場・部屋 | 部屋の中心ではなく、通常利用する扉の前または入口 |
| 階段 | その階で階段へ入る踊り場・階段口 |
| 建物入口 | 建物へ出入りする実際の扉・通路の境界 |
| 屋外 | 歩道・歩行者路の中央。建物、芝生、車道を横切らない位置 |

目視確認では次を守ります。

- ルート線が壁、閉鎖区画、机、植栽、車道などを横切っていない
- 1本のエッジから次のエッジへ、来場者が自然に曲がれる
- 一本道の途中に不要なノードを増やさない
- 曲がり角を1本の斜め線でショートカットしない
- 交差点を接続したい場合は、その交点にノードがある

なお、最短経路の距離はSVG座標から計算されます。ノードを大きく動かすと、表示だけでなく選ばれる経路も変わります。

## 4. 対象SVGを選ぶ

| 表示場所 | 編集するSVG | `floorId` |
|---|---|---|
| キャンパス屋外 | `CampusMap_base_plain.svg` | `campus` |
| 研究棟1F | `RQ1F_base_plain.svg` | `rq-1f` |
| 研究棟2F | `RQ2F_base_plain.svg` | `rq-2f` |
| 研究棟3F | `RQ3F_base_plain.svg` | `rq-3f` |
| 講義棟1F | `LH1F_base_plain.svg` | `lh-1f` |
| 講義棟2F | `LH2F_base_plain.svg` | `lh-2f` |
| 学生ホール1F | `SH1F_base_plain.svg` | `sh-1f` |
| 学生ホール2F | `SH2F_base_plain.svg` | `sh-2f` |
| UBIC | `UBIC_base_plain.svg` | `ubic-1f` |
| LICTiA 1F | `LICTiA1F_base_plain.svg` | `lictia-1f` |

すべてのSVGは1フロアだけを持ち、`data-floor-id`はRouteグループへ設定します。
ノードとエッジへ個別の`data-floor-id`を追加してはいけません。

## 5. 推奨する安全な作業方法

Inkscapeは、保存時にRoute以外のXMLも並べ替えたり書き換えたりする可能性があります。
そのため、**リポジトリ内の元SVGはInkscapeで直接上書きせず、作業用コピーで座標を決める**方法を推奨します。

以下では研究棟1Fを例にします。他の地図ではファイル名を読み替えてください。

### 5.1 作業前の確認

プロジェクトのターミナルで実行します。

```bash
git status --short
```

対象SVGに自分が作ったものではない変更が表示された場合は、上書きせず作業を止めて担当者へ確認します。

現在のグラフが正常かも確認します。

```bash
bun run verify:routes
```

### 5.2 Inkscape用のコピーを作る

```bash
cp public/maps/RQ1F_base_plain.svg /tmp/RQ1F_route_work.svg
```

`/tmp/RQ1F_route_work.svg` をVS Codeで開き、`id="Route"` を検索します。
Routeグループの表示指定を一時的に次のようにします。

変更前:

```svg
style="display:none"
```

作業用コピーだけの変更:

```svg
style="display:inline;fill:#ff00ff;stroke:#ff00ff;stroke-width:1"
```

これでルートノードとルート線がマゼンタ色で見えるようになります。
この一時スタイルは元SVGへコピーしません。
元SVGのRouteグループは、最後まで `style="display:none"` のままにします。

### 5.3 Inkscapeで位置を決める

1. 作業用コピーをInkscapeで開く
2. 「オブジェクト」ダイアログまたはXMLエディターで `Route` を探す
3. Route以外の地図要素はロックし、誤選択を防ぐ
4. 対象の丸を選び、通路や扉に合う位置を目視で決める
5. XMLエディターで対象 `circle` の `cx` と `cy` を確認する
6. 接続する各 `path` の端点も同じ位置へ合わせる

拡大・縮小や回転は使わず、位置だけを変更します。
Route要素に `transform` が追加された場合は、その状態を元SVGへ反映してはいけません。

ドラッグで正確な値が得にくい場合は、XMLエディターで `cx` と `cy` を直接少しずつ変更し、
キャンバスを見ながら決める方が安全です。

## 6. 決めた座標を元SVGへ反映する

元SVGをVS Codeで開き、対象ノードのIDを検索します。

例として、次のノードを `(70, 260)` から `(74, 258)` へ動かす場合を示します。

変更前:

```svg
<circle
   id="route_node_rq1_161"
   data-route-node=""
   data-kind="corridor"
   data-place-id="rq1-161"
   cx="70"
   cy="260"
   r="2" />
```

変更後:

```svg
<circle
   id="route_node_rq1_161"
   data-route-node=""
   data-kind="corridor"
   data-place-id="rq1-161"
   cx="74"
   cy="258"
   r="2" />
```

次に、そのノードIDを参照しているエッジをすべて探します。

```bash
rg -n "route_node_rq1_161" public/maps/RQ1F_base_plain.svg
```

エッジの `data-node-a` 側なら `M` の座標を、`data-node-b` 側なら `L` の座標を変更します。

```svg
<path
   id="route_edge_entrance_junction_to_161"
   data-route-edge=""
   data-node-a="route_node_entrance_west_junction"
   data-node-b="route_node_rq1_161"
   d="M 70 174 L 74 258" />

<path
   id="route_edge_161_to_middle_west"
   data-route-edge=""
   data-node-a="route_node_rq1_161"
   data-node-b="route_node_middle_west"
   d="M 74 258 L 70 346" />
```

重要な対応関係は次のとおりです。

| エッジ内の位置 | `d`で一致させる場所 |
|---|---|
| `data-node-a` | `M x y` |
| `data-node-b` | `L x y` |

1つのノードに3本以上のエッジがつながっている場合も、該当する全エッジを更新します。
1本でも更新漏れがあれば検証でエラーになります。

## 7. 特別なノードの注意

### Place付きノード

`data-place-id` は、イベント会場やQR現在地など、アプリ上の地点との対応です。
位置を動かしても値は変更・削除しません。

Place付きノードは、部屋の中央よりも**来場者が到着したと判断できる入口**へ置きます。

### 階段ノード

`data-kind="stairs"` と `data-stair-id` を維持します。
同じ `data-stair-id` を持つ別フロアのノードは、自動的にフロア間接続されます。

- フロアをまたぐ線はSVGへ描かない
- 各フロアでは、そのフロアの階段口へ個別に配置する
- 別フロア同士で `cx` / `cy` を同じ値にする必要はない

### 建物入口ノード

`data-kind="entrance"` と `data-entrance-id` を維持します。
キャンパス側と建物側の同じ入口IDは、自動的に接続されます。

- キャンパス側と建物側を1本の線で直接つながない
- 2枚のSVGで座標系が異なるため、座標を同じ値にする必要はない
- それぞれの地図上で正しい入口位置へ置く

## 8. 曲がり方そのものを直す場合

既存ノードを動かすだけで壁を避けられない場合は、曲がり角に新しいノードを追加し、
1本のエッジを2本以上へ分割します。

例えばAからBの間に曲がり角Cを追加する場合:

1. `corridor` ノードCを追加する
2. 既存のA–Bエッジを削除する
3. A–Cエッジを追加する
4. C–Bエッジを追加する
5. 各エッジを絶対座標の直線 `M x y L x y` にする

IDはSVG内で重複しない、英字から始まるASCII名にします。

```svg
<circle
   id="route_node_new_corner"
   data-route-node=""
   data-kind="corridor"
   cx="120"
   cy="200"
   r="2" />

<path
   id="route_edge_a_to_new_corner"
   data-route-edge=""
   data-node-a="route_node_a"
   data-node-b="route_node_new_corner"
   d="M 80 200 L 120 200" />

<path
   id="route_edge_new_corner_to_b"
   data-route-edge=""
   data-node-a="route_node_new_corner"
   data-node-b="route_node_b"
   d="M 120 200 L 120 240" />
```

単に線同士を交差させても接続にはなりません。分岐を作るなら、必ず交点ノードと分割したエッジが必要です。

ノードの追加・削除や接続変更は、既存ノードの移動より影響が大きいため、変更後は複数の出発地・目的地で経路を確認します。

## 9. グラフを再生成する

元SVGへの反映が終わったら、プロジェクトのターミナルで実行します。

```bash
bun run generate:routes
```

成功すると `src/features/routing/generated/routeGraph.json` が更新されます。

既存ノードの位置だけを動かした場合、現在の基準ではノード数とエッジ数は
`104ノード / 112エッジ` のままです。数が変わった場合は、意図せず要素を追加・削除していないか確認します。

## 10. 必須の自動検証

以下をすべて実行します。

```bash
bun run verify:routes
bun test
bun run verify:places
bun run build
git diff --check
```

期待する結果:

- `verify:routes`: SVGと生成JSONが一致し、Route契約エラーがない
- `bun test`: 全Placeが到達可能で、グラフ全体が分断されていない
- `verify:places`: 既存の地図要素IDが保全され、36件PASS
- `build`: TypeScriptとViteビルドが成功
- `git diff --check`: 空白や改行の異常がない

`verify:routes` の代表的なエラー:

| エラー | 主な原因 |
|---|---|
| 始終点が参照ノード座標と一致しません | `cx`/`cy`を変えたが、接続エッジの`d`を更新していない |
| 絶対座標の直線pathではありません | `d`が`M x y L x y`以外、またはInkscapeが曲線形式へ変換した |
| Route内の要素にtransformは使用できません | Inkscapeの移動で`transform`が追加された |
| 未定義ノードを参照しています | エッジの`data-node-a`/`data-node-b`が誤字または削除済み |
| RouteグラフJSONがSVGと一致しません | `generate:routes`を実行していない |

## 11. ブラウザで目視確認する

```bash
bun run dev
```

表示されたローカルURLをスマホ幅402pxで開きます。

確認する経路は、動かしたノードを必ず通る出発地と目的地の組合せにします。

- Place付きノード: そのPlaceを出発地または目的地にする
- 通路の分岐: 分岐の両側にあるPlace同士を選ぶ
- 階段: 変更した階と別の階にあるPlace同士を選ぶ
- 建物入口: 建物内のPlaceと別建物・屋外のPlaceを選ぶ

最低限、次を確認します。

- 線が通路の中央を通る
- 壁や立入不可領域を横切らない
- 曲がり角で不自然なショートカットをしない
- 現在地から目的地まで線が途切れない
- 意図した階段・入口を使う
- 逆方向の経路でも同じ場所を通る
- ブラウザのコンソールにエラーがない

代表的な確認URLは [STATUS.md](STATUS.md) の「動作確認手順」にあります。

## 12. 最後の差分確認

```bash
git status --short
git diff -- public/maps/RQ1F_base_plain.svg
git diff -- src/features/routing/generated/routeGraph.json
```

ファイル名は実際に編集したものへ読み替えます。

既存ノードの位置調整だけなら、最終差分はおおむね次に限定されます。

- 対象ノードの `cx` / `cy`
- 接続エッジの `d`
- 生成JSON内の対象ノード座標、接続エッジの距離と `pathD`

Route以外の地図要素、既存ID、SVGの `viewBox`、大量の無関係な書式変更が差分に出た場合は、そのまま採用しません。

## 完了チェックリスト

- [ ] 対象SVGを正しく選んだ
- [ ] Route以外を変更していない
- [ ] ノードが実際に歩ける位置にある
- [ ] 接続する全エッジの端点を更新した
- [ ] IDと `data-*` 属性を維持した
- [ ] 元SVGのRouteグループが `style="display:none"` のまま
- [ ] `transform` が追加されていない
- [ ] `bun run generate:routes` を実行した
- [ ] 5つの自動検証がすべてPASSした
- [ ] 対象ノードを通る経路をブラウザで確認した
- [ ] Route外の予期しない差分がない
