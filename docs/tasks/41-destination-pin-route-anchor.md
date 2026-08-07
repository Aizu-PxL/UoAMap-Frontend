# 41: 目的地ピンのルート終端固定

## GOAL

目的地ピンの先端を、イベントバッジの最終座標ではなく**ルート終端**(目的地Placeに対応するルートグラフノード = ルート線の最後の端点)へ固定する。タスク39で入れた「イベントバッジ座標への追従」を置き換える。イベントバッジはラベル回避と外形クランプでルート終端からズレるため、ピンがルート線の端から離れて見えていた。

## 参照

- `docs/SPEC.md` §3.1「イベント開催地マーカー」、§3.1.1「マーカー・ピン」
- `docs/tasks/39-event-destination-pin-anchor.md`(本ブリーフが置き換える)
- `docs/tasks/35-event-marker-node-anchor.md`
- `src/features/map/mapMarkerPresentation.ts`
- `src/features/map/mapOverlayLayout.ts`

## やること

- 目的地ピンの座標を、同一Place・同一フロアのルートノード(`RouteNode.placeId` 一致)から解決する。イベントバッジが既に使っている解決関数を共有し、新しい座標解決経路は増やさない。
- ルートノードを持たないPlaceだけ、従来どおりPlace座標へフォールバックする。
- 現在地未設定でルートを表示していない場合も同じ座標を使い、ルート表示の開始・終了でピンを動かさない。
- 目的地と重なるイベントバッジ(個別・キャンパス建物集約)は引き続き最終出力から除く。バッジのDOM・クリック領域・キーボードフォーカス対象を残さない。
- overlayレイアウトでバッジ最終座標をピンへ移す処理を廃止し、ピン座標をレイアウト前後で不変にする。ピンの除外矩形はラベル選定と最終判定で同じものを使う。
- 目的地ピンと重なる地点名ラベルは非表示にせず、marker層(ラベル層より前面)のピンを上に重ねる。現在地・注目ピンの既存のラベル退避は変更しない。
- 現在地ピン・注目ピンはPlace座標のまま変更しない。キャンパス俯瞰への屋内現在地投影も変更しない。
- CSS、Figma、イベントデータ、地図SVG、Routeグラフ、経路計算(`findShortestRoute` / `routePresentation` / `mapNavigation`)、Repository/API、URLは変更しない。

## SCOPE

- `docs/SPEC.md`
- `docs/STATUS.md`
- `docs/tasks/41-destination-pin-route-anchor.md`
- `src/features/map/mapMarkerPresentation.ts`
- `src/features/map/mapMarkerPresentation.test.ts`
- `src/features/map/mapOverlayLayout.ts`
- `src/features/map/mapOverlayLayout.test.ts`

## 受入基準

- [x] 目的地ピンの先端座標が、表示中フロアのルート線の終端と一致する。
- [x] 目的地ピンと同じ地点のイベントバッジ(個別・建物集約)が最終出力に残らない。
- [x] ルートノードを持たないPlaceはPlace座標へフォールバックし、現在地・注目ピン、別フロア、キャンパス俯瞰の投影現在地は従来どおり。
- [x] 目的地ピンと重なる地点名ラベルが表示され続け、現在地・注目ピンのラベル退避は従来どおり。
- [x] ルート未表示(`to`のみ)でもピン座標が同じで、ルート開始でピンが動かない。
- [x] `bun run verify:all`が、125 Place / 89 QR / 61 Eventを含めてPASSする。
- [x] 402×874pxで、フロアをまたぐ経路を含む代表URLのピン座標とルート終端の一致、バッジ非表示、ズーム後の維持、console errorなしを確認する。
- [x] 会話履歴なしの読み取り専用独立レビューの指摘を解消する(初回レビューの指摘内容と対応はDELIVERABLEに記録)。

## DELIVERABLE

- 変更ファイル: `docs/SPEC.md`、`docs/STATUS.md`、本ブリーフ、`src/features/map/mapMarkerPresentation.ts`とテスト、`src/features/map/mapOverlayLayout.ts`とテスト
- 受入結果: 全項目PASS。`verify:all`は187 tests / 1,243 assertions、125 Place / 89 QR / 61 Event、350 nodes / 448 edges、build・diff checkをPASS。402×874pxで`/?at=main_node_11&to=U1&focus=lh_room_m8`のルート終端`M 182 443 L 201 418`と目的地ピンのアンカー`(201, 418)`が一致し(旧実装のバッジ位置は`(201, 403.51)`)、M8バッジDOM 0件。`/?at=rq_room_161&to=P12`は3Fで終端`M 419 372 L 419 393`とピン`(419, 393)`が一致し、到着階の階段マーカー0件、P12バッジ0件。`/?to=A1`はピン`(353, 563)`・講堂前バッジ0件、`/?to=L1`はピン`(49, 522)`で同じPlaceの注目ピン`(54.23, 526.62)`と区別できる。3段ズーム後もアンカー`(201, 418)`を維持しscaleのみ変化。ラベルは`/?to=U1`で目的地の`M8(103)`が表示され、`/?focus=lh_room_m8`では従来どおり非表示。console error 0件
- 設計判断: 座標決定を`createMapMarkerPresentation`へ一本化し、overlayレイアウトはバッジ除去だけを担当する。イベントバッジと同じ`resolveRouteAnchoredCoordinates`を共有して、バッジ基準位置とピン位置の出所を1か所に保つ
- レビュー: 会話履歴なしの読み取り専用独立レビューでP2 2件・P3 7件の指摘。P2のうち「同一Placeでの目的地ピンと現在地・注目ピンの微小なズレ」は§3.1.1へ明記して仕様化(挙動は変更なし)。「目的地ピンと重なる地点名ラベルが落ちる」はユーザー判断でラベルを残す方針とし、目的地ピンをラベル選定の除外矩形から外して前面へ重ねる実装へ変更した。P3はSTATUS索引・旧ブリーフ39の置換注記・キャンパス投影バレットの表現・テスト名を修正し、ピン種別ごとのラベル退避(目的地は残す、現在地・注目はバッジ配置より前に落とす)を固定するテストを追加した。既存からの持ち越し(`anchoredLabelIds`が本番未使用)は本スライス対象外とした
- 未実施: ブラウザペイン非表示のためスクリーンショットは取得せず、座標はDOMのtransformとルートpathで確認した
