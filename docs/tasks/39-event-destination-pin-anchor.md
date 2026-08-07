# 39: イベント位置への目的地ピン置換

> **置き換え済み**: 目的地ピンの座標は `docs/tasks/41-destination-pin-route-anchor.md` でルート終端固定へ変更した。以下のうち「イベントバッジ最終中心へピン先端を置く」部分は現行仕様ではない（バッジを最終出力から除く挙動は現行も同じ）。

## GOAL

イベントを目的地に設定したとき、イベントバッジを非表示にし、赤い目的地ピンの先端を選択前のイベントバッジ中心と同じ座標へ表示する。現在地・注目ピン、ルート終点、URL、イベント操作は維持する。

## 参照

- `docs/SPEC.md` §3.1「イベント開催地マーカー」、§3.1.1「マーカー・ピン」
- `docs/WORKFLOW.md`
- `docs/tasks/02h-event-marker-visibility.md`
- `docs/tasks/35-event-marker-node-anchor.md`
- `src/features/map/mapMarkerPresentation.ts`
- `src/features/map/mapOverlayLayout.ts`

## やること

- 目的地ピンが置換するイベントを、個別Placeまたはキャンパス集約建物として内部マーカーモデルに保持する。
- 目的地と重なるイベントバッジを通常どおりラベル回避・外形クランプした後、その最終中心座標を目的地ピンの先端へ引き継ぎ、イベントバッジを最終出力から除く。
- 最終的な水滴ピン位置でラベル衝突を判定し、非表示にしたバッジのDOM・クリック領域・キーボードフォーカス対象を残さない。
- 現在地・注目ピンとの重複、対応イベントなし、別フロア、複数ピン同時重複は既存のPlace座標と優先順位を維持する。
- CSS、Figma、イベントデータ、地図SVG、Routeグラフ、Repository/API、URLと経路終点は変更しない。

## SCOPE

- `docs/SPEC.md`
- `docs/STATUS.md`
- `docs/tasks/39-event-destination-pin-anchor.md`
- `src/features/map/mapMarkerPresentation.ts`
- `src/features/map/mapMarkerPresentation.test.ts`
- `src/features/map/mapOverlayLayout.ts`
- `src/features/map/mapOverlayLayout.test.ts`
- `src/features/map/MapCanvas.tsx`

## 受入基準

- [x] 個別イベントとキャンパス集約イベントで、設定前の最終バッジ中心と設定後の目的地ピン先端が一致し、イベントバッジが最終出力に残らない。
- [x] 対応イベントなし、別フロア、現在地・注目ピンとの重複は既存挙動を維持する。
- [x] 最終ピン位置でラベル衝突を判定し、通常イベントの配置・タップ・キーボード操作・描画順を維持する。
- [x] `bun run verify:all`が、125 Place / 89 QR / 61 Eventを含めてPASSする。
- [x] 402×874pxで同じviewBox・ズーム率の通常`A1`バッジと目的地ピンの座標一致、`/?to=A1`のバッジ非表示、経路表示、パン・ズーム、console errorなしを確認する。
- [x] 会話履歴なしの読み取り専用独立レビューで指摘がない。

## DELIVERABLE

- 変更ファイル: `docs/SPEC.md`、`docs/STATUS.md`、本ブリーフ、`src/features/map/MapCanvas.tsx`、`mapMarkerPresentation.ts`とテスト、`mapOverlayLayout.ts`とテスト
- 受入結果: 全項目PASS。`verify:all`は178 tests / 1,146 assertions、125 Place / 89 QR / 61 Event、350 nodes / 448 edges、build・diff checkをPASS。402×874pxで同一viewBoxのA1バッジ／目的地ピンが`(353, 563)`で一致し、A1バッジDOM 0件、経路線8本、パン・ズーム後の表示維持、console error 0件を確認した（localhostカメラHTTPS warningのみ既存どおり）。会話履歴なしの読み取り専用独立レビューは指摘なし
- 設計判断: 目的地と重なるイベントを配置用に通常レイアウトへ通し、確定座標を目的地ピンへ移してからバッジを除く。最終ピン位置でラベルを再判定し、現在地・注目ピンは従来どおりイベント生成前に優先する
