# 40: キャンパス全体図への屋内現在地表示

## GOAL

屋内Placeを現在地にしたままキャンパス全体図へ戻ったとき、対応建物内のおおよその相対位置へ既存の青い現在地ピンを表示する。階数表示は追加せず、屋内フロア図の正確な現在地、屋外現在地、目的地・注目地点、URLと経路は維持する。

## 参照

- `docs/SPEC.md` §3.1.1「マーカー・ピン」
- `docs/WORKFLOW.md`
- `docs/tasks/29-current-marker-route-start.md`
- `src/features/map/mapMarkerPresentation.ts`
- `src/features/map/MapCanvas.tsx`

## やること

- 研究棟3フロア、講義棟2フロア、学生ホール2フロア、UBIC、LICTiAのルートSVG表示範囲とキャンパス建物IDを明示的に対応づける。
- 屋内Placeと同一フロアのRouteノード座標をフロアSVG表示範囲内の比率へ変換し、キャンパス建物bbox内の概略位置へ写像・クランプする。
- キャンパス全体図に限って屋内現在地を投影し、対応情報を解決できない場合はピンを省略する。
- 投影した現在地と同じ建物のイベント集約バッジを省略し、既存のピン描画、固定画面サイズ、ラベル衝突判定を再利用する。
- CSS、Figma、地図SVG、Routeグラフ、Place・QR・Event、Repository/API、URL、目的地・注目地点の別フロア表示は変更しない。

## SCOPE

- `docs/SPEC.md`
- `docs/STATUS.md`
- `docs/tasks/40-campus-current-marker-projection.md`
- `src/features/map/MapCanvas.tsx`
- `src/features/map/mapMarkerPresentation.ts`
- `src/features/map/mapMarkerPresentation.test.ts`

## 受入基準

- [x] 9屋内フロアの現在地をキャンパス全体図の対応建物bbox内へ投影し、屋内フロア図では従来座標を維持する。
- [x] 投影位置の正規化・クランプ、未解決時の省略、屋外現在地、目的地・注目地点、同建物イベント集約バッジの優先順位を純粋関数テストで固定する。
- [x] `bun run verify:all`が、125 Place / 89 QR / 61 Eventを含めてPASSする。
- [x] 402×874pxで9フロア、代表ケースのズーム・パン、屋外現在地、ルート表示、階数表示なし、console errorなしを確認する。
- [x] 会話履歴なしの読み取り専用独立レビューで指摘がない。

## DELIVERABLE

- 変更ファイル: `docs/SPEC.md`、`docs/STATUS.md`、本ブリーフ、`src/features/map/MapCanvas.tsx`、`src/features/map/mapMarkerPresentation.ts`、`src/features/map/mapMarkerPresentation.test.ts`
- 受入結果: 全項目PASS。`verify:all`は183 tests / 1,231 assertions、125 Place / 89 QR / 61 Event、350 nodes / 448 edges、build・diff checkをPASS。402×874pxで9フロアの屋内／キャンパス表示、対応建物bbox内のピン、階数テキストなし、同建物集約バッジ抑止、ズーム・パン、屋外現在地、建物間経路、console error/warn 0件を確認した。初回独立レビューのRouteノード欠損時フォールバック指摘を修正し、最終再レビューは指摘なし
- 設計判断: Routeノード座標を各ルートSVGのviewBox（RQ2Fのみwidth/height）内で正規化し、表示中キャンパスSVGから取得した建物bboxへ写像する。マーカー配置モデルへ座標を渡して既存の固定サイズ描画・ラベル衝突判定を再利用し、欠損時は誤ったフォールバックを行わない
